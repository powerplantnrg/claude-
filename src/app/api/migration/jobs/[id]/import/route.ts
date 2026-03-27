import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  generateOpeningBalances,
  generateMigrationJournalEntries,
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

    if (!["Transforming", "Importing"].includes(job.status)) {
      return NextResponse.json(
        { error: "Import can only be run when job status is Transforming or Importing" },
        { status: 400 }
      )
    }

    // Check for unresolved review items
    const unresolvedCount = await prisma.migrationMapping.count({
      where: { migrationJobId: id, requiresReview: true, status: "PendingReview" },
    })

    if (unresolvedCount > 0) {
      return NextResponse.json(
        { error: `Cannot import: ${unresolvedCount} mapping(s) still require review` },
        { status: 400 }
      )
    }

    // Update job status to Importing
    await prisma.migrationJob.update({
      where: { id },
      data: { status: "Importing" },
    })

    // Fetch all approved/mapped mappings ready for import
    const mappings = await prisma.migrationMapping.findMany({
      where: {
        migrationJobId: id,
        status: { in: ["Mapped", "Approved"] },
      },
    })

    let imported = 0
    let failed = 0
    let skipped = 0

    // Group by entity type for ordered processing
    const mappingsByType: Record<string, typeof mappings> = {}
    for (const mapping of mappings) {
      if (!mappingsByType[mapping.entityType]) {
        mappingsByType[mapping.entityType] = []
      }
      mappingsByType[mapping.entityType].push(mapping)
    }

    // Process accounts first, then contacts, then invoices
    const processingOrder = ["accounts", "contacts", "invoices"]
    const sortedTypes = Object.keys(mappingsByType).sort(
      (a, b) => (processingOrder.indexOf(a) ?? 99) - (processingOrder.indexOf(b) ?? 99)
    )

    for (const entityType of sortedTypes) {
      const entityMappings = mappingsByType[entityType]

      for (const mapping of entityMappings) {
        try {
          const sourceData = mapping.sourceData ? JSON.parse(mapping.sourceData) as Record<string, unknown> : {} as Record<string, unknown>
          let targetId: string | null = mapping.targetId

          // If already mapped to an existing entity, skip creation
          if (targetId) {
            await prisma.migrationMapping.update({
              where: { id: mapping.id },
              data: { status: "Imported" },
            })
            imported++
            continue
          }

          // Create target entity based on entity type
          if (entityType === "accounts") {
            const account = await prisma.account.create({
              data: {
                code: (sourceData.code as string) || `MIG-${mapping.sourceCode ?? ""}`,
                name: (sourceData.name as string) || mapping.sourceName || "Unnamed",
                type: (sourceData.type as string) || "Expense",
                subType: (sourceData.subType as string) || null,
                description: (sourceData.description as string) || `Migrated from ${job.sourceSystem}`,
                taxType: (sourceData.taxCode as string) || null,
                organizationId: orgId,
              },
            })
            targetId = account.id
          } else if (entityType === "contacts") {
            const contact = await prisma.contact.create({
              data: {
                name: (sourceData.name as string) || mapping.sourceName || "Unnamed",
                email: (sourceData.email as string) || null,
                phone: (sourceData.phone as string) || null,
                contactType: (sourceData.type as string) || "Customer",
                organizationId: orgId,
              },
            })
            targetId = contact.id
          } else if (entityType === "invoices") {
            const invoice = await prisma.invoice.create({
              data: {
                invoiceNumber: (sourceData.invoiceNumber as string) || `MIG-${mapping.sourceCode ?? ""}`,
                contactId: sourceData.contactId as string,
                date: new Date((sourceData.date as string) || new Date().toISOString()),
                dueDate: new Date((sourceData.dueDate as string) || new Date().toISOString()),
                status: "Draft",
                subtotal: Number(sourceData.subTotal) || 0,
                taxTotal: Number(sourceData.taxAmount) || 0,
                total: Number(sourceData.total) || 0,
                organizationId: orgId,
              },
            })
            targetId = invoice.id
          } else {
            skipped++
            await prisma.migrationMapping.update({
              where: { id: mapping.id },
              data: {
                status: "Skipped",
                mappingNotes: `Unknown entity type: ${entityType}`,
              },
            })
            continue
          }

          // Update mapping with created target
          await prisma.migrationMapping.update({
            where: { id: mapping.id },
            data: {
              targetId,
              targetEntityType: entityType,
              status: "Imported",
            },
          })

          await prisma.migrationAuditLog.create({
            data: {
              migrationJobId: id,
              action: "EntityImported",
              entityType,
              entityId: targetId,
              sourceData: mapping.sourceData ?? undefined,
              targetData: JSON.stringify({ targetId }),
              details: `Imported ${entityType} record: ${mapping.sourceName || mapping.sourceCode}`,
              userId,
              timestamp: new Date(),
            },
          })

          imported++
        } catch (err) {
          failed++
          console.error(`Error importing mapping ${mapping.id}:`, err)

          await prisma.migrationMapping.update({
            where: { id: mapping.id },
            data: {
              status: "Error",
              mappingNotes: `Import error: ${(err as Error).message}`,
            },
          })

          await prisma.migrationAuditLog.create({
            data: {
              migrationJobId: id,
              action: "ImportError",
              entityType,
              entityId: mapping.id,
              details: `Import failed: ${(err as Error).message}`,
              userId,
              timestamp: new Date(),
            },
          })
        }
      }
    }

    // Generate opening balance journal entries
    const accountMappings = mappings
      .filter((m) => m.entityType === "accounts" && m.targetId)
      .map((m) => {
        const sourceData = m.sourceData ? JSON.parse(m.sourceData) as Record<string, unknown> : {} as Record<string, unknown>
        return {
          accountId: m.targetId as string,
          accountCode: (sourceData.code as string) || m.sourceCode || "",
          balance: parseFloat(String(sourceData.balance ?? sourceData.openingBalance ?? "0")) || 0,
        }
      })

    const openingBalances = generateOpeningBalances(accountMappings, new Date())

    // Generate migration journal entries via the library
    const migrationJournalResult = await generateMigrationJournalEntries(
      id,
      mappings.map((m) => ({
        entityType: m.entityType,
        sourceId: m.sourceId,
        targetId: m.targetId,
        sourceName: m.sourceName || "",
        amount: m.sourceData ? (parseFloat(String((JSON.parse(m.sourceData) as Record<string, unknown>).total ?? "0")) || 0) : 0,
      }))
    )

    // Get next journal entry number
    const lastEntry = await prisma.journalEntry.findFirst({
      where: { organizationId: orgId },
      orderBy: { entryNumber: "desc" },
    })
    let nextEntryNumber = (lastEntry?.entryNumber || 0) + 1

    // Create opening balance journal entries
    for (const ob of openingBalances) {
      const journalEntry = await prisma.journalEntry.create({
        data: {
          entryNumber: nextEntryNumber++,
          date: ob.date,
          reference: `MIG-${job.id.slice(0, 8)}-OB`,
          narration: ob.description || `Migration opening balance from ${job.sourceSystem}`,
          status: "Posted",
          organizationId: orgId,
          lines: {
            create: [{
              accountId: ob.accountId,
              debit: ob.debit,
              credit: ob.credit,
              description: ob.description || "Migration opening balance",
            }],
          },
        },
      })

      await prisma.migrationJournalEntry.create({
        data: {
          migrationJobId: id,
          journalEntryId: journalEntry.id,
          description: ob.description || "Opening balance",
          entryType: "OpeningBalance",
          sourceReference: `${job.sourceSystem}-OB`,
          amount: ob.debit || ob.credit || 0,
        },
      })
    }

    // Update job progress
    await prisma.migrationJob.update({
      where: { id },
      data: {
        importedRecords: { increment: imported },
        failedRecords: { increment: failed },
        skippedRecords: { increment: skipped },
      },
    })

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: "ImportComplete",
        entityType: "MigrationJob",
        entityId: id,
        details: `Import complete: ${imported} imported, ${failed} failed, ${skipped} skipped. ${openingBalances.length} opening balance entries. Migration journal: ${migrationJournalResult.created} created, ${migrationJournalResult.skipped} skipped.`,
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: mappings.length,
        imported,
        failed,
        skipped,
        openingBalanceEntries: openingBalances.length,
        migrationJournalEntries: migrationJournalResult,
      },
    })
  } catch (error) {
    console.error("Error running import:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
