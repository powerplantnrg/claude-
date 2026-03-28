import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  createAccountMapping,
  transformAccountCode,
  transformTaxCode,
  recategorizeTransaction,
  detectDuplicates,
  type MigrationRuleInput,
  type SourceAccount,
  type TargetAccount,
} from "@/lib/migration/transform-engine"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
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

    // Convert rules to MigrationRuleInput format
    const ruleInputs: MigrationRuleInput[] = rules.map((r) => ({
      entityType: r.entityType,
      sourceField: r.sourceField,
      sourceValue: r.sourceValue,
      targetField: r.targetField,
      targetValue: r.targetValue,
      ruleType: r.ruleType,
      priority: r.priority,
    }))

    // Fetch target chart of accounts for mapping
    const targetAccounts = await prisma.account.findMany({
      where: { organizationId: orgId },
      select: { id: true, code: true, name: true, type: true, subType: true },
    })

    const targetAccountsMapped: TargetAccount[] = targetAccounts.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      subType: a.subType ?? undefined,
    }))

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
      const entityRules = ruleInputs.filter((r) => r.entityType === entityType)

      // Detect duplicates within this entity type
      const sourceRecords = mappings.map((m) => {
        const sourceData = m.sourceData ? JSON.parse(m.sourceData) : {} as Record<string, unknown>
        return {
          id: m.id,
          name: (sourceData as Record<string, unknown>).name as string || m.sourceName || "",
          amount: parseFloat(String((sourceData as Record<string, unknown>).amount ?? "0")) || undefined,
          date: (sourceData as Record<string, unknown>).date as string | undefined,
        }
      })

      // Use empty array for existing records since we are comparing within source
      const duplicates = detectDuplicates(sourceRecords, sourceRecords, entityType)
      const duplicateSourceIds = new Set(duplicates.map((d) => d.sourceId))
      duplicatesDetected += duplicates.length

      for (const mapping of mappings) {
        try {
          const sourceData = mapping.sourceData ? JSON.parse(mapping.sourceData) : {} as Record<string, unknown>
          let targetId: string | null = null
          let targetEntityType: string | null = null
          let requiresReview = false
          const transformLog: string[] = []

          // Check if this mapping is a duplicate
          if (duplicateSourceIds.has(mapping.id)) {
            requiresReview = true
            transformLog.push("Flagged as potential duplicate")
          }

          // Apply rules
          for (const rule of entityRules) {
            const sourceValue = (sourceData as Record<string, unknown>)[rule.sourceField]

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
            const sourceAccount: SourceAccount = {
              code: (sourceData as Record<string, unknown>).code as string || "",
              name: (sourceData as Record<string, unknown>).name as string || "",
              type: (sourceData as Record<string, unknown>).type as string || "",
              taxType: (sourceData as Record<string, unknown>).taxCode as string | undefined,
              balance: parseFloat(String((sourceData as Record<string, unknown>).balance ?? "0")) || undefined,
            }
            const accountMappings = createAccountMapping([sourceAccount], targetAccountsMapped, entityRules)
            if (accountMappings.length > 0 && accountMappings[0].targetId) {
              targetId = accountMappings[0].targetId
              targetEntityType = "Account"
              transformLog.push(`Auto-mapped account: ${accountMappings[0].matchMethod}`)
            }

            // Transform account code
            const transformedCode = transformAccountCode(
              (sourceData as Record<string, unknown>).code as string || "",
              job.sourceSystem,
              entityRules
            )
            if (transformedCode) {
              transformLog.push(`Account code transformed: ${(sourceData as Record<string, unknown>).code} -> ${transformedCode}`)
            }

            // Transform tax code
            const transformedTax = transformTaxCode(
              (sourceData as Record<string, unknown>).taxCode as string || "",
              job.sourceSystem
            )
            if (transformedTax) {
              transformLog.push(`Tax code transformed: ${(sourceData as Record<string, unknown>).taxCode} -> ${transformedTax}`)
            }
          }

          if (!targetId && entityType === "invoices") {
            const transaction = {
              description: (sourceData as Record<string, unknown>).description as string || "",
              amount: parseFloat(String((sourceData as Record<string, unknown>).amount ?? "0")) || 0,
              accountCode: (sourceData as Record<string, unknown>).accountCode as string | undefined,
            }
            const recategorized = recategorizeTransaction(transaction, entityRules, targetAccountsMapped)
            if (recategorized) {
              transformLog.push(`Transaction recategorized: ${recategorized.ruleName}`)
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
              transformLog: JSON.stringify(transformLog),
            },
          })

          await prisma.migrationAuditLog.create({
            data: {
              migrationJobId: id,
              action: "Transform",
              entityType,
              entityId: mapping.id,
              sourceData: mapping.sourceData ?? undefined,
              targetData: JSON.stringify({ targetId, targetEntityType }),
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
              transformLog: JSON.stringify([`Error during transformation: ${(err as Error).message}`]),
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
