/**
 * Migration Reconciliation Engine
 * Compares source data totals against imported data to ensure
 * migration accuracy and flag variances.
 */

import { prisma } from "@/lib/prisma"

// ============================================
// Types
// ============================================

export interface ReconciliationResult {
  entityType: string
  sourceTotal: number
  importedTotal: number
  variance: number
  variancePercentage: number
  status: "Matched" | "Variance" | "Pending"
}

export interface ReconciliationReport {
  migrationJobId: string
  jobName: string
  sourceSystem: string
  reconciliations: ReconciliationResult[]
  overallStatus: "Matched" | "Variance" | "Pending"
  totalVariance: number
  flaggedItems: FlaggedVariance[]
  generatedAt: Date
}

export interface FlaggedVariance {
  entityType: string
  variance: number
  variancePercentage: number
  severity: "Low" | "Medium" | "High"
}

// ============================================
// Reconciliation Functions
// ============================================

/**
 * Compare source account totals vs imported totals.
 * Uses mapping data and imported records to calculate variance.
 */
export async function reconcileAccounts(
  migrationJobId: string
): Promise<ReconciliationResult> {
  const mappings = await prisma.migrationMapping.findMany({
    where: { migrationJobId, entityType: "Account" },
  })

  let sourceTotal = 0
  let importedTotal = 0

  for (const mapping of mappings) {
    // Parse source data to extract balance
    if (mapping.sourceData) {
      try {
        const sourceRecord = JSON.parse(mapping.sourceData)
        sourceTotal += parseFloat(sourceRecord.balance ?? sourceRecord.openingBalance ?? "0") || 0
      } catch {
        // Skip unparseable records
      }
    }

    // Get imported account balance from journal lines
    if (mapping.targetId && mapping.status === "Created") {
      const lines = await prisma.journalLine.aggregate({
        where: { accountId: mapping.targetId },
        _sum: { debit: true, credit: true },
      })
      importedTotal += (lines._sum.debit ?? 0) - (lines._sum.credit ?? 0)
    }
  }

  const variance = Math.abs(sourceTotal - importedTotal)
  const variancePercentage =
    sourceTotal !== 0 ? (variance / Math.abs(sourceTotal)) * 100 : 0
  const status = variance < 0.01 ? "Matched" : "Variance"

  // Store reconciliation result
  await prisma.migrationReconciliation.upsert({
    where: {
      id: await getReconciliationId(migrationJobId, "Account"),
    },
    create: {
      migrationJobId,
      entityType: "Account",
      sourceTotal,
      importedTotal,
      variance,
      variancePercentage,
      status,
    },
    update: {
      sourceTotal,
      importedTotal,
      variance,
      variancePercentage,
      status,
    },
  })

  return { entityType: "Account", sourceTotal, importedTotal, variance, variancePercentage, status }
}

/**
 * Verify contact counts match between source and imported data.
 */
export async function reconcileContactCounts(
  migrationJobId: string
): Promise<ReconciliationResult> {
  const mappings = await prisma.migrationMapping.findMany({
    where: { migrationJobId, entityType: "Contact" },
  })

  const sourceTotal = mappings.length
  const importedTotal = mappings.filter(
    (m) => m.status === "Created" || m.status === "Mapped"
  ).length
  const skipped = mappings.filter((m) => m.status === "Skipped").length

  const variance = sourceTotal - importedTotal - skipped
  const variancePercentage =
    sourceTotal !== 0 ? (variance / sourceTotal) * 100 : 0
  const status = variance === 0 ? "Matched" : "Variance"

  await prisma.migrationReconciliation.upsert({
    where: {
      id: await getReconciliationId(migrationJobId, "Contact"),
    },
    create: {
      migrationJobId,
      entityType: "Contact",
      sourceTotal,
      importedTotal,
      variance,
      variancePercentage,
      status,
    },
    update: {
      sourceTotal,
      importedTotal,
      variance,
      variancePercentage,
      status,
    },
  })

  return { entityType: "Contact", sourceTotal, importedTotal, variance, variancePercentage, status }
}

/**
 * Compare invoice/bill totals between source and imported data.
 */
export async function reconcileTransactionTotals(
  migrationJobId: string
): Promise<ReconciliationResult[]> {
  const results: ReconciliationResult[] = []

  for (const entityType of ["Invoice", "Bill"]) {
    const mappings = await prisma.migrationMapping.findMany({
      where: { migrationJobId, entityType },
    })

    let sourceTotal = 0
    let importedTotal = 0

    for (const mapping of mappings) {
      if (mapping.sourceData) {
        try {
          const sourceRecord = JSON.parse(mapping.sourceData)
          sourceTotal += parseFloat(sourceRecord.total ?? "0") || 0
        } catch {
          // Skip unparseable records
        }
      }

      if (mapping.targetId && mapping.status === "Created") {
        if (entityType === "Invoice") {
          const invoice = await prisma.invoice.findUnique({
            where: { id: mapping.targetId },
          })
          if (invoice) importedTotal += invoice.total
        } else {
          const bill = await prisma.bill.findUnique({
            where: { id: mapping.targetId },
          })
          if (bill) importedTotal += bill.total
        }
      }
    }

    const variance = Math.abs(sourceTotal - importedTotal)
    const variancePercentage =
      sourceTotal !== 0 ? (variance / Math.abs(sourceTotal)) * 100 : 0
    const status = variance < 0.01 ? "Matched" : "Variance"

    await prisma.migrationReconciliation.upsert({
      where: {
        id: await getReconciliationId(migrationJobId, entityType),
      },
      create: {
        migrationJobId,
        entityType,
        sourceTotal,
        importedTotal,
        variance,
        variancePercentage,
        status,
      },
      update: {
        sourceTotal,
        importedTotal,
        variance,
        variancePercentage,
        status,
      },
    })

    results.push({ entityType, sourceTotal, importedTotal, variance, variancePercentage, status })
  }

  return results
}

/**
 * Compare payroll YTD figures between source and imported data.
 */
export async function reconcilePayrollTotals(
  migrationJobId: string
): Promise<ReconciliationResult> {
  const mappings = await prisma.migrationMapping.findMany({
    where: { migrationJobId, entityType: "Payslip" },
  })

  let sourceTotal = 0
  let importedTotal = 0

  for (const mapping of mappings) {
    if (mapping.sourceData) {
      try {
        const sourceRecord = JSON.parse(mapping.sourceData)
        sourceTotal +=
          parseFloat(sourceRecord.grossPay ?? sourceRecord.grossWages ?? "0") || 0
      } catch {
        // Skip unparseable records
      }
    }

    if (mapping.targetId && mapping.status === "Created") {
      const payslip = await prisma.payslip.findUnique({
        where: { id: mapping.targetId },
      })
      if (payslip) importedTotal += payslip.grossPay
    }
  }

  const variance = Math.abs(sourceTotal - importedTotal)
  const variancePercentage =
    sourceTotal !== 0 ? (variance / Math.abs(sourceTotal)) * 100 : 0
  const status = variance < 0.01 ? "Matched" : "Variance"

  await prisma.migrationReconciliation.upsert({
    where: {
      id: await getReconciliationId(migrationJobId, "Payslip"),
    },
    create: {
      migrationJobId,
      entityType: "Payslip",
      sourceTotal,
      importedTotal,
      variance,
      variancePercentage,
      status,
    },
    update: {
      sourceTotal,
      importedTotal,
      variance,
      variancePercentage,
      status,
    },
  })

  return { entityType: "Payslip", sourceTotal, importedTotal, variance, variancePercentage, status }
}

/**
 * Generate a full reconciliation summary with variances.
 */
export async function generateReconciliationReport(
  migrationJobId: string
): Promise<ReconciliationReport> {
  const job = await prisma.migrationJob.findUnique({
    where: { id: migrationJobId },
  })

  if (!job) {
    throw new Error(`Migration job ${migrationJobId} not found`)
  }

  // Run all reconciliation checks
  const accountResult = await reconcileAccounts(migrationJobId)
  const contactResult = await reconcileContactCounts(migrationJobId)
  const transactionResults = await reconcileTransactionTotals(migrationJobId)
  const payrollResult = await reconcilePayrollTotals(migrationJobId)

  const reconciliations = [
    accountResult,
    contactResult,
    ...transactionResults,
    payrollResult,
  ]

  const totalVariance = reconciliations.reduce(
    (sum, r) => sum + Math.abs(r.variance),
    0
  )

  const overallStatus = reconciliations.every((r) => r.status === "Matched")
    ? "Matched"
    : reconciliations.some((r) => r.status === "Pending")
      ? "Pending"
      : "Variance"

  const flaggedItems = reconciliations
    .filter((r) => r.status === "Variance")
    .map((r) => ({
      entityType: r.entityType,
      variance: r.variance,
      variancePercentage: r.variancePercentage,
      severity: getSeverity(r.variancePercentage),
    }))

  return {
    migrationJobId,
    jobName: job.name,
    sourceSystem: job.sourceSystem,
    reconciliations,
    overallStatus,
    totalVariance,
    flaggedItems,
    generatedAt: new Date(),
  }
}

/**
 * Auto-flag items exceeding a tolerance percentage.
 */
export async function flagVariances(
  migrationJobId: string,
  tolerancePercent: number
): Promise<FlaggedVariance[]> {
  const reconciliations = await prisma.migrationReconciliation.findMany({
    where: { migrationJobId },
  })

  const flagged: FlaggedVariance[] = []

  for (const recon of reconciliations) {
    if (recon.variancePercentage > tolerancePercent) {
      flagged.push({
        entityType: recon.entityType,
        variance: recon.variance,
        variancePercentage: recon.variancePercentage,
        severity: getSeverity(recon.variancePercentage),
      })

      // Update status to Variance if not already
      if (recon.status !== "Variance" && recon.status !== "Reviewed") {
        await prisma.migrationReconciliation.update({
          where: { id: recon.id },
          data: { status: "Variance" },
        })
      }
    }
  }

  // Log the flagging action
  await prisma.migrationAuditLog.create({
    data: {
      migrationJobId,
      action: "ReconciliationRun",
      details: JSON.stringify({
        tolerancePercent,
        flaggedCount: flagged.length,
        flaggedItems: flagged,
      }),
    },
  })

  return flagged
}

// ============================================
// Helpers
// ============================================

function getSeverity(
  variancePercentage: number
): "Low" | "Medium" | "High" {
  if (variancePercentage > 5) return "High"
  if (variancePercentage > 1) return "Medium"
  return "Low"
}

async function getReconciliationId(
  migrationJobId: string,
  entityType: string
): Promise<string> {
  const existing = await prisma.migrationReconciliation.findFirst({
    where: { migrationJobId, entityType },
  })
  return existing?.id ?? "nonexistent-placeholder-id"
}
