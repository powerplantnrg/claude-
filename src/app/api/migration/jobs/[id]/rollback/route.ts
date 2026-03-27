import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  canRollback,
  rollbackMigration,
  generateRollbackReport,
} from "@/lib/migration/rollback"

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
      include: {
        mappings: true,
        journalEntries: {
          include: { journalEntry: true },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: "Migration job not found" }, { status: 404 })
    }

    if (job.status !== "Completed") {
      return NextResponse.json(
        { error: "Rollback is only available for completed migrations" },
        { status: 400 }
      )
    }

    if (!job.rollbackAvailable) {
      return NextResponse.json(
        { error: "Rollback is no longer available for this migration" },
        { status: 400 }
      )
    }

    // Check rollback deadline
    const rollbackCheck = await canRollback(id)
    if (!rollbackCheck.canRollback) {
      return NextResponse.json(
        {
          error: rollbackCheck.reason ?? "Rollback not available",
          rollbackDeadline: rollbackCheck.deadline?.toISOString(),
        },
        { status: 400 }
      )
    }

    // Collect all imported entity IDs by type
    const importedMappings = job.mappings.filter(
      (m) => m.status === "Imported" && m.targetId
    )

    const entitiesToDelete: Record<string, string[]> = {}
    for (const mapping of importedMappings) {
      if (!entitiesToDelete[mapping.entityType]) {
        entitiesToDelete[mapping.entityType] = []
      }
      entitiesToDelete[mapping.entityType].push(mapping.targetId as string)
    }

    // Delete imported entities in reverse order (invoices first, then contacts, then accounts)
    const deletionOrder = ["invoices", "contacts", "accounts"]
    let deletedCount = 0

    for (const entityType of deletionOrder) {
      const ids = entitiesToDelete[entityType]
      if (!ids || ids.length === 0) continue

      try {
        if (entityType === "invoices") {
          await prisma.invoice.deleteMany({ where: { id: { in: ids } } })
        } else if (entityType === "contacts") {
          await prisma.contact.deleteMany({ where: { id: { in: ids } } })
        } else if (entityType === "accounts") {
          // Remove journal lines first for these accounts
          await prisma.journalLine.deleteMany({
            where: { accountId: { in: ids } },
          })
          await prisma.account.deleteMany({ where: { id: { in: ids } } })
        }

        deletedCount += ids.length

        await prisma.migrationAuditLog.create({
          data: {
            migrationJobId: id,
            action: "RollbackEntityDeleted",
            entityType,
            entityId: ids.join(","),
            details: `Deleted ${ids.length} ${entityType} records during rollback`,
            userId,
            timestamp: new Date(),
          },
        })
      } catch (err) {
        console.error(`Error rolling back ${entityType}:`, err)

        await prisma.migrationAuditLog.create({
          data: {
            migrationJobId: id,
            action: "RollbackError",
            entityType,
            entityId: ids.join(","),
            details: `Error deleting ${entityType}: ${(err as Error).message}`,
            userId,
            timestamp: new Date(),
          },
        })
      }
    }

    // Delete migration journal entries and their corresponding journal entries
    for (const mje of job.journalEntries) {
      try {
        // Delete journal lines first
        await prisma.journalLine.deleteMany({
          where: { journalEntryId: mje.journalEntryId },
        })
        // Delete the journal entry
        await prisma.journalEntry.delete({
          where: { id: mje.journalEntryId },
        })
      } catch (err) {
        console.error(`Error deleting journal entry ${mje.journalEntryId}:`, err)
      }
    }

    // Delete migration journal entry records
    await prisma.migrationJournalEntry.deleteMany({
      where: { migrationJobId: id },
    })

    // Create rollback journal entries for audit trail
    await rollbackMigration(job.id, userId)

    // Reset mapping statuses
    await prisma.migrationMapping.updateMany({
      where: { migrationJobId: id, status: "Imported" },
      data: { status: "RolledBack", targetId: null },
    })

    // Update job status
    const updated = await prisma.migrationJob.update({
      where: { id },
      data: {
        status: "RolledBack",
        rollbackAvailable: false,
        importedRecords: 0,
      },
    })

    // Generate rollback report
    const report = await generateRollbackReport(job.id)

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: "MigrationRolledBack",
        entityType: "MigrationJob",
        entityId: id,
        details: `Migration rolled back. ${deletedCount} imported entities deleted. All migration journal entries removed.`,
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      job: updated,
      deletedEntities: deletedCount,
      report,
    })
  } catch (error) {
    console.error("Error rolling back migration:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
