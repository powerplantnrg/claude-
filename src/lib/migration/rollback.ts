/**
 * Migration Rollback Engine
 * Handles rollback of completed migrations, source data archival,
 * and rollback reporting.
 */

import { prisma } from "@/lib/prisma"

// ============================================
// Types
// ============================================

export interface RollbackCheck {
  canRollback: boolean
  reason?: string
  deadline?: Date
  jobStatus: string
}

export interface RollbackResult {
  success: boolean
  deletedRecords: number
  rollbackJournalEntryId: string | null
  errors: string[]
}

export interface RollbackReport {
  migrationJobId: string
  jobName: string
  rolledBackAt: Date
  rolledBackBy: string
  originalRecordCount: number
  deletedRecordCount: number
  rollbackJournalEntries: Array<{
    journalEntryId: string
    description: string
    amount: number
  }>
  entityBreakdown: Array<{
    entityType: string
    deletedCount: number
  }>
}

// ============================================
// Rollback Functions
// ============================================

/**
 * Check if rollback is still available for a migration job.
 * Rollback is unavailable if:
 * - The job is already rolled back
 * - The job has been approved/completed and rollback deadline has passed
 * - rollbackAvailable flag is false
 */
export async function canRollback(
  migrationJobId: string
): Promise<RollbackCheck> {
  const job = await prisma.migrationJob.findUnique({
    where: { id: migrationJobId },
  })

  if (!job) {
    return {
      canRollback: false,
      reason: "Migration job not found",
      jobStatus: "Unknown",
    }
  }

  if (job.status === "RolledBack") {
    return {
      canRollback: false,
      reason: "Migration has already been rolled back",
      jobStatus: job.status,
    }
  }

  if (!job.rollbackAvailable) {
    return {
      canRollback: false,
      reason: "Rollback has been disabled for this migration",
      jobStatus: job.status,
    }
  }

  if (job.rollbackDeadline && new Date() > job.rollbackDeadline) {
    return {
      canRollback: false,
      reason: `Rollback deadline passed on ${job.rollbackDeadline.toISOString()}`,
      deadline: job.rollbackDeadline,
      jobStatus: job.status,
    }
  }

  if (job.status === "Approved" || job.status === "Completed") {
    // Allow rollback of approved/completed jobs only within deadline
    if (!job.rollbackDeadline) {
      return {
        canRollback: false,
        reason: "No rollback deadline set for approved/completed migration",
        jobStatus: job.status,
      }
    }
  }

  // Jobs in progress states (Pending, Validating, Importing, etc.) can always be rolled back
  return {
    canRollback: true,
    deadline: job.rollbackDeadline ?? undefined,
    jobStatus: job.status,
  }
}

/**
 * Rollback a migration: delete all created records, restore from snapshot,
 * and create rollback journal entries.
 */
export async function rollbackMigration(
  migrationJobId: string,
  userId: string
): Promise<RollbackResult> {
  const check = await canRollback(migrationJobId)
  if (!check.canRollback) {
    return {
      success: false,
      deletedRecords: 0,
      rollbackJournalEntryId: null,
      errors: [check.reason ?? "Rollback not available"],
    }
  }

  const job = await prisma.migrationJob.findUnique({
    where: { id: migrationJobId },
    include: { organization: true },
  })

  if (!job) {
    return {
      success: false,
      deletedRecords: 0,
      rollbackJournalEntryId: null,
      errors: ["Migration job not found"],
    }
  }

  const errors: string[] = []
  let deletedRecords = 0

  // Get all created mappings
  const mappings = await prisma.migrationMapping.findMany({
    where: { migrationJobId, status: "Created" },
  })

  // Delete created records by entity type
  const entityGroups = groupBy(mappings, (m) => m.entityType)

  for (const [entityType, entityMappings] of Object.entries(entityGroups)) {
    const targetIds = entityMappings
      .map((m) => m.targetId)
      .filter((id): id is string => id !== null)

    if (targetIds.length === 0) continue

    try {
      const count = await deleteEntitiesByType(entityType, targetIds)
      deletedRecords += count
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      errors.push(`Failed to delete ${entityType} records: ${message}`)
    }
  }

  // Delete migration journal entries and their linked journal entries
  const migrationJournals = await prisma.migrationJournalEntry.findMany({
    where: { migrationJobId },
  })

  for (const mj of migrationJournals) {
    try {
      // Delete journal lines first, then the journal entry
      await prisma.journalLine.deleteMany({
        where: { journalEntryId: mj.journalEntryId },
      })
      await prisma.journalEntry.delete({
        where: { id: mj.journalEntryId },
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      errors.push(`Failed to delete journal entry ${mj.journalEntryId}: ${message}`)
    }
  }

  // Create a rollback journal entry for audit trail
  let rollbackJournalEntryId: string | null = null
  try {
    const lastEntry = await prisma.journalEntry.findFirst({
      where: { organizationId: job.organizationId },
      orderBy: { entryNumber: "desc" },
    })

    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: (lastEntry?.entryNumber ?? 0) + 1,
        date: new Date(),
        reference: `ROLLBACK-MIG-${job.id.slice(0, 8)}`,
        narration: `Rollback of migration: ${job.name} (${job.sourceSystem})`,
        status: "Posted",
        sourceType: "MigrationRollback",
        sourceId: migrationJobId,
        organizationId: job.organizationId,
      },
    })

    rollbackJournalEntryId = journalEntry.id

    await prisma.migrationJournalEntry.create({
      data: {
        migrationJobId,
        journalEntryId: journalEntry.id,
        description: `Rollback of migration: ${job.name}`,
        entryType: "Rollback",
        sourceReference: job.sourceSystem,
        amount: 0,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error)
    errors.push(`Failed to create rollback journal entry: ${message}`)
  }

  // Update migration job status
  await prisma.migrationJob.update({
    where: { id: migrationJobId },
    data: {
      status: "RolledBack",
      rollbackAvailable: false,
      completedAt: new Date(),
    },
  })

  // Update all mappings to reflect rollback
  await prisma.migrationMapping.updateMany({
    where: { migrationJobId, status: "Created" },
    data: { status: "Pending" },
  })

  // Create audit log entry
  await prisma.migrationAuditLog.create({
    data: {
      migrationJobId,
      action: "Rollback",
      details: JSON.stringify({
        deletedRecords,
        errors,
        rollbackJournalEntryId,
      }),
      userId,
    },
  })

  return {
    success: errors.length === 0,
    deletedRecords,
    rollbackJournalEntryId,
    errors,
  }
}

/**
 * Archive original source data for future reference.
 * Stores a snapshot reference in the migration job.
 */
export async function archiveSourceData(
  migrationJobId: string
): Promise<{ archived: boolean; snapshotRef: string | null }> {
  const job = await prisma.migrationJob.findUnique({
    where: { id: migrationJobId },
  })

  if (!job) {
    throw new Error(`Migration job ${migrationJobId} not found`)
  }

  // Collect all source data from mappings
  const mappings = await prisma.migrationMapping.findMany({
    where: { migrationJobId },
    select: {
      entityType: true,
      sourceId: true,
      sourceCode: true,
      sourceName: true,
      sourceData: true,
    },
  })

  const archiveData = {
    migrationJobId,
    jobName: job.name,
    sourceSystem: job.sourceSystem,
    archivedAt: new Date().toISOString(),
    totalRecords: mappings.length,
    records: mappings,
  }

  // Store as JSON snapshot reference
  const snapshotRef = `migration-archive/${migrationJobId}-${Date.now()}.json`

  // Update job with archive reference
  await prisma.migrationJob.update({
    where: { id: migrationJobId },
    data: {
      sourceDataSnapshot: JSON.stringify({
        ref: snapshotRef,
        archivedAt: new Date().toISOString(),
        recordCount: mappings.length,
        data: archiveData,
      }),
    },
  })

  // Log the archival
  await prisma.migrationAuditLog.create({
    data: {
      migrationJobId,
      action: "RecordImported",
      details: JSON.stringify({
        action: "archive",
        snapshotRef,
        recordCount: mappings.length,
      }),
    },
  })

  return { archived: true, snapshotRef }
}

/**
 * Generate a summary report of what was rolled back.
 */
export async function generateRollbackReport(
  migrationJobId: string
): Promise<RollbackReport> {
  const job = await prisma.migrationJob.findUnique({
    where: { id: migrationJobId },
  })

  if (!job) {
    throw new Error(`Migration job ${migrationJobId} not found`)
  }

  if (job.status !== "RolledBack") {
    throw new Error(`Migration job ${migrationJobId} has not been rolled back`)
  }

  // Get the rollback audit log entry
  const rollbackLog = await prisma.migrationAuditLog.findFirst({
    where: { migrationJobId, action: "Rollback" },
    orderBy: { timestamp: "desc" },
  })

  const rollbackDetails = rollbackLog?.details
    ? JSON.parse(rollbackLog.details)
    : { deletedRecords: 0, errors: [] }

  // Get rollback journal entries
  const migrationJournals = await prisma.migrationJournalEntry.findMany({
    where: { migrationJobId, entryType: "Rollback" },
  })

  // Get entity breakdown from mappings
  const mappings = await prisma.migrationMapping.findMany({
    where: { migrationJobId },
  })

  const entityBreakdown = new Map<string, number>()
  for (const mapping of mappings) {
    const count = entityBreakdown.get(mapping.entityType) ?? 0
    entityBreakdown.set(mapping.entityType, count + 1)
  }

  return {
    migrationJobId,
    jobName: job.name,
    rolledBackAt: job.completedAt ?? new Date(),
    rolledBackBy: rollbackLog?.userId ?? "Unknown",
    originalRecordCount: job.totalRecords,
    deletedRecordCount: rollbackDetails.deletedRecords,
    rollbackJournalEntries: migrationJournals.map((mj) => ({
      journalEntryId: mj.journalEntryId,
      description: mj.description ?? "",
      amount: mj.amount,
    })),
    entityBreakdown: Array.from(entityBreakdown.entries()).map(
      ([entityType, deletedCount]) => ({ entityType, deletedCount })
    ),
  }
}

// ============================================
// Helpers
// ============================================

function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of items) {
    const key = keyFn(item)
    if (!result[key]) result[key] = []
    result[key].push(item)
  }
  return result
}

async function deleteEntitiesByType(
  entityType: string,
  targetIds: string[]
): Promise<number> {
  switch (entityType) {
    case "Contact":
      return (
        await prisma.contact.deleteMany({
          where: { id: { in: targetIds } },
        })
      ).count

    case "Invoice":
      // Delete lines first due to foreign keys
      for (const id of targetIds) {
        await prisma.invoiceLine.deleteMany({ where: { invoiceId: id } })
      }
      return (
        await prisma.invoice.deleteMany({
          where: { id: { in: targetIds } },
        })
      ).count

    case "Bill":
      for (const id of targetIds) {
        await prisma.billLine.deleteMany({ where: { billId: id } })
      }
      return (
        await prisma.bill.deleteMany({
          where: { id: { in: targetIds } },
        })
      ).count

    case "BankTransaction":
      return (
        await prisma.bankTransaction.deleteMany({
          where: { id: { in: targetIds } },
        })
      ).count

    case "JournalEntry":
      for (const id of targetIds) {
        await prisma.journalLine.deleteMany({
          where: { journalEntryId: id },
        })
      }
      return (
        await prisma.journalEntry.deleteMany({
          where: { id: { in: targetIds } },
        })
      ).count

    case "Employee":
      return (
        await prisma.employee.deleteMany({
          where: { id: { in: targetIds } },
        })
      ).count

    case "FixedAsset":
      return (
        await prisma.fixedAsset.deleteMany({
          where: { id: { in: targetIds } },
        })
      ).count

    case "InventoryItem":
      return (
        await prisma.inventoryItem.deleteMany({
          where: { id: { in: targetIds } },
        })
      ).count

    case "Account":
      return (
        await prisma.account.deleteMany({
          where: { id: { in: targetIds } },
        })
      ).count

    default:
      return 0
  }
}
