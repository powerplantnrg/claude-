import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  reconcileAccounts,
  reconcileContactCounts,
  reconcileTransactionTotals,
  generateReconciliationReport,
  flagVariances,
} from "@/lib/migration/reconciliation"

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

    if (!["Importing", "Reconciling"].includes(job.status)) {
      return NextResponse.json(
        { error: "Reconciliation can only be run when job status is Importing or Reconciling" },
        { status: 400 }
      )
    }

    // Update status to Reconciling
    await prisma.migrationJob.update({
      where: { id },
      data: { status: "Reconciling" },
    })

    // Delete existing reconciliation records to allow re-running
    await prisma.migrationReconciliation.deleteMany({
      where: { migrationJobId: id },
    })

    // Fetch all mappings grouped by entity type
    const mappings = await prisma.migrationMapping.findMany({
      where: { migrationJobId: id },
    })

    const mappingsByType: Record<string, typeof mappings> = {}
    for (const mapping of mappings) {
      if (!mappingsByType[mapping.entityType]) {
        mappingsByType[mapping.entityType] = []
      }
      mappingsByType[mapping.entityType].push(mapping)
    }

    const reconciliationResults: Array<{
      entityType: string
      sourceTotal: number
      importedTotal: number
      variance: number
      variancePercentage: number
      status: string
    }> = []

    // Reconcile accounts
    if (mappingsByType.accounts) {
      const accountMappings = mappingsByType.accounts
      const sourceData = accountMappings.map((m) => m.sourceData as Record<string, unknown>)
      const importedIds = accountMappings
        .filter((m) => m.status === "Imported" && m.targetId)
        .map((m) => m.targetId as string)

      const accountRecon = reconcileAccounts(sourceData, importedIds)

      const variance = accountRecon.sourceTotal - accountRecon.importedTotal
      const variancePercentage =
        accountRecon.sourceTotal > 0
          ? (Math.abs(variance) / accountRecon.sourceTotal) * 100
          : 0

      const varianceFlags = flagVariances(variance, variancePercentage)
      const status = varianceFlags.hasIssue ? "Variance" : "Matched"

      reconciliationResults.push({
        entityType: "accounts",
        sourceTotal: accountRecon.sourceTotal,
        importedTotal: accountRecon.importedTotal,
        variance,
        variancePercentage,
        status,
      })
    }

    // Reconcile contacts
    if (mappingsByType.contacts) {
      const contactMappings = mappingsByType.contacts
      const sourceData = contactMappings.map((m) => m.sourceData as Record<string, unknown>)
      const importedIds = contactMappings
        .filter((m) => m.status === "Imported" && m.targetId)
        .map((m) => m.targetId as string)

      const contactRecon = reconcileContactCounts(sourceData, importedIds)

      const variance = contactRecon.sourceTotal - contactRecon.importedTotal
      const variancePercentage =
        contactRecon.sourceTotal > 0
          ? (Math.abs(variance) / contactRecon.sourceTotal) * 100
          : 0

      const varianceFlags = flagVariances(variance, variancePercentage)
      const status = varianceFlags.hasIssue ? "Variance" : "Matched"

      reconciliationResults.push({
        entityType: "contacts",
        sourceTotal: contactRecon.sourceTotal,
        importedTotal: contactRecon.importedTotal,
        variance,
        variancePercentage,
        status,
      })
    }

    // Reconcile invoices/transactions
    if (mappingsByType.invoices) {
      const invoiceMappings = mappingsByType.invoices
      const sourceData = invoiceMappings.map((m) => m.sourceData as Record<string, unknown>)
      const importedIds = invoiceMappings
        .filter((m) => m.status === "Imported" && m.targetId)
        .map((m) => m.targetId as string)

      const txnRecon = reconcileTransactionTotals(sourceData, importedIds)

      const variance = txnRecon.sourceTotal - txnRecon.importedTotal
      const variancePercentage =
        txnRecon.sourceTotal > 0
          ? (Math.abs(variance) / txnRecon.sourceTotal) * 100
          : 0

      const varianceFlags = flagVariances(variance, variancePercentage)
      const status = varianceFlags.hasIssue ? "Variance" : "Matched"

      reconciliationResults.push({
        entityType: "invoices",
        sourceTotal: txnRecon.sourceTotal,
        importedTotal: txnRecon.importedTotal,
        variance,
        variancePercentage,
        status,
      })
    }

    // Create reconciliation records
    for (const recon of reconciliationResults) {
      await prisma.migrationReconciliation.create({
        data: {
          migrationJobId: id,
          entityType: recon.entityType,
          sourceTotal: recon.sourceTotal,
          importedTotal: recon.importedTotal,
          variance: recon.variance,
          variancePercentage: recon.variancePercentage,
          status: recon.status,
        },
      })
    }

    // Generate report
    const report = generateReconciliationReport(reconciliationResults)

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: "ReconciliationComplete",
        entityType: "MigrationJob",
        entityId: id,
        details: `Reconciliation complete: ${reconciliationResults.length} entity types reconciled. Variances: ${reconciliationResults.filter((r) => r.status === "Variance").length}`,
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      reconciliations: reconciliationResults,
      report,
    })
  } catch (error) {
    console.error("Error running reconciliation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
