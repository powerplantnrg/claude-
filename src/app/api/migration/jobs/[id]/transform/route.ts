import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  createAccountMapping,
  transformAccountCode,
  transformTaxCode,
  recategorizeTransaction,
  detectDuplicates,
} from "@/lib/migration/transform-engine"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string
    const { id } = await params

    const job = await prisma.migrationJob.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!job) {
      return NextResponse.json({ error: "Migration job not found" }, { status: 404 })
    }

    if (!["Validating", "Transforming"].includes(job.status)) {
      return NextResponse.json(
        { error: "Transform can only be run when job status is Validating or Transforming" },
        { status: 400 }
      )
    }

    // Update job status to Transforming
    await prisma.migrationJob.update({
      where: { id },
      data: { status: "Transforming" },
    })

    // Fetch all pending mappings
    const pendingMappings = await prisma.migrationMapping.findMany({
      where: { migrationJobId: id, status: "Pending" },
    })

    // Fetch active rules for this job
    const rules = await prisma.migrationRule.findMany({
      where: { migrationJobId: id, active: true },
      orderBy: { priority: "asc" },
    })

    let transformed = 0
    let flaggedForReview = 0
    let duplicatesDetected = 0
    let errors = 0

    // Group mappings by entity type
    const mappingsByType: Record<string, typeof pendingMappings> = {}
    for (const mapping of pendingMappings) {
      if (!mappingsByType[mapping.entityType]) {
        mappingsByType[mapping.entityType] = []
      }
      mappingsByType[mapping.entityType].push(mapping)
    }

    for (const [entityType, mappings] of Object.entries(mappingsByType)) {
      const entityRules = rules.filter((r) => r.entityType === entityType)

      // Detect duplicates within this entity type
      const duplicates = detectDuplicates(
        mappings.map((m) => ({
          id: m.id,
          sourceData: m.sourceData as Record<string, unknown>,
        }))
      )
      duplicatesDetected += duplicates.length

      for (const mapping of mappings) {
        try {
          const sourceData = mapping.sourceData as Record<string, unknown>
          let targetId: string | null = null
          let targetEntityType: string | null = null
          let requiresReview = false
          const transformLog: string[] = []

          // Check if this mapping is a duplicate
          if (duplicates.includes(mapping.id)) {
            requiresReview = true
            transformLog.push("Flagged as potential duplicate")
          }

          // Apply rules
          for (const rule of entityRules) {
            const sourceValue = sourceData[rule.sourceField]

            if (rule.ruleType === "Mapping" && rule.sourceValue === String(sourceValue)) {
              targetId = rule.targetValue
              targetEntityType = rule.entityType
              transformLog.push(`Mapped via rule: ${rule.sourceField}=${rule.sourceValue} -> ${rule.targetValue}`)
            }

            if (rule.ruleType === "Transform") {
              transformLog.push(`Transform rule applied: ${rule.sourceField} -> ${rule.targetField}`)
            }

            if (rule.ruleType === "Filter" && rule.sourceValue === String(sourceValue)) {
              transformLog.push(`Filter rule matched: skipping record`)
            }
          }

          // Auto-mapping based on entity type
          if (!targetId && entityType === "accounts") {
            const accountMapping = createAccountMapping(sourceData)
            if (accountMapping) {
              targetId = accountMapping.targetId
              targetEntityType = "Account"
              transformLog.push(`Auto-mapped account: ${accountMapping.description}`)
            }

            // Transform account code
            const transformedCode = transformAccountCode(
              sourceData.code as string,
              job.sourceSystem
            )
            if (transformedCode) {
              transformLog.push(`Account code transformed: ${sourceData.code} -> ${transformedCode}`)
            }

            // Transform tax code
            const transformedTax = transformTaxCode(
              sourceData.taxCode as string,
              job.sourceSystem
            )
            if (transformedTax) {
              transformLog.push(`Tax code transformed: ${sourceData.taxCode} -> ${transformedTax}`)
            }
          }

          if (!targetId && entityType === "invoices") {
            const recategorized = recategorizeTransaction(sourceData, job.sourceSystem)
            if (recategorized) {
              transformLog.push(`Transaction recategorized: ${recategorized.description}`)
            }
          }

          // If no auto-mapping found, flag for review
          if (!targetId && !requiresReview) {
            requiresReview = true
            transformLog.push("No automatic mapping found - flagged for manual review")
          }

          const newStatus = requiresReview ? "PendingReview" : "Mapped"

          await prisma.migrationMapping.update({
            where: { id: mapping.id },
            data: {
              targetId,
              targetEntityType,
              status: newStatus,
              requiresReview,
              transformLog: transformLog as any,
            },
          })

          await prisma.migrationAuditLog.create({
            data: {
              migrationJobId: id,
              action: "Transform",
              entityType,
              entityId: mapping.id,
              sourceData: mapping.sourceData as any,
              targetData: { targetId, targetEntityType } as any,
              details: transformLog.join("; "),
              userId,
              timestamp: new Date(),
            },
          })

          if (requiresReview) {
            flaggedForReview++
          } else {
            transformed++
          }
        } catch (err) {
          errors++
          console.error(`Error transforming mapping ${mapping.id}:`, err)

          await prisma.migrationMapping.update({
            where: { id: mapping.id },
            data: {
              status: "Error",
              transformLog: [`Error during transformation: ${(err as Error).message}`] as any,
            },
          })
        }
      }
    }

    // Update job warning records count
    await prisma.migrationJob.update({
      where: { id },
      data: {
        warningRecords: { increment: flaggedForReview },
        failedRecords: { increment: errors },
      },
    })

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: "TransformComplete",
        entityType: "MigrationJob",
        entityId: id,
        details: `Transformation complete: ${transformed} transformed, ${flaggedForReview} flagged for review, ${duplicatesDetected} duplicates detected, ${errors} errors`,
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: pendingMappings.length,
        transformed,
        flaggedForReview,
        duplicatesDetected,
        errors,
      },
    })
  } catch (error) {
    console.error("Error running transformation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
