import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const job = await prisma.migrationJob.findFirst({
      where: { id, organizationId: orgId },
      include: {
        mappings: true,
        reconciliations: true,
        journalEntries: {
          include: { journalEntry: true },
        },
        _count: {
          select: { auditLogs: true },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: "Migration job not found" }, { status: 404 })
    }

    // Summary stats
    const summary = {
      jobId: job.id,
      name: job.name,
      sourceSystem: job.sourceSystem,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      totalRecords: job.totalRecords,
      importedRecords: job.importedRecords,
      failedRecords: job.failedRecords,
      warningRecords: job.warningRecords,
      skippedRecords: job.skippedRecords,
      rollbackAvailable: job.rollbackAvailable,
      rollbackDeadline: job.rollbackDeadline,
      auditLogEntries: job._count.auditLogs,
    }

    // Mapping breakdown by entity type
    const mappingBreakdown: Record<
      string,
      { total: number; byStatus: Record<string, number> }
    > = {}

    for (const mapping of job.mappings) {
      if (!mappingBreakdown[mapping.entityType]) {
        mappingBreakdown[mapping.entityType] = { total: 0, byStatus: {} }
      }
      mappingBreakdown[mapping.entityType].total++
      mappingBreakdown[mapping.entityType].byStatus[mapping.status] =
        (mappingBreakdown[mapping.entityType].byStatus[mapping.status] || 0) + 1
    }

    // Reconciliation results
    const reconciliationResults = job.reconciliations.map((r) => ({
      entityType: r.entityType,
      sourceTotal: r.sourceTotal,
      importedTotal: r.importedTotal,
      variance: r.variance,
      variancePercentage: r.variancePercentage,
      status: r.status,
      reconciledById: r.reconciledById,
      reconciledAt: r.reconciledAt,
      notes: r.notes,
    }))

    // Variance analysis
    const varianceAnalysis = job.reconciliations
      .filter((r) => r.status === "Variance")
      .map((r) => ({
        entityType: r.entityType,
        variance: r.variance,
        variancePercentage: r.variancePercentage,
        severity:
          r.variancePercentage > 5
            ? "High"
            : r.variancePercentage > 1
              ? "Medium"
              : "Low",
        notes: r.notes,
      }))

    // Journal entries summary
    const journalEntriesSummary = {
      total: job.journalEntries.length,
      byType: {} as Record<string, { count: number; totalAmount: number }>,
    }

    for (const mje of job.journalEntries) {
      if (!journalEntriesSummary.byType[mje.entryType]) {
        journalEntriesSummary.byType[mje.entryType] = { count: 0, totalAmount: 0 }
      }
      journalEntriesSummary.byType[mje.entryType].count++
      journalEntriesSummary.byType[mje.entryType].totalAmount += Number(mje.amount) || 0
    }

    // Audit trail summary
    const auditLogSummary = await prisma.migrationAuditLog.groupBy({
      by: ["action"],
      where: { migrationJobId: id },
      _count: { id: true },
    })

    const auditTrailSummary = auditLogSummary.map((entry) => ({
      action: entry.action,
      count: entry._count.id,
    }))

    // Source vs target comparison
    const sourceVsTarget: Record<
      string,
      { sourceCount: number; targetCount: number; matchRate: number }
    > = {}

    for (const [entityType, breakdown] of Object.entries(mappingBreakdown)) {
      const importedCount = breakdown.byStatus["Imported"] || 0
      const sourceCount = breakdown.total
      sourceVsTarget[entityType] = {
        sourceCount,
        targetCount: importedCount,
        matchRate: sourceCount > 0 ? (importedCount / sourceCount) * 100 : 0,
      }
    }

    return NextResponse.json({
      summary,
      mappingBreakdown,
      reconciliationResults,
      varianceAnalysis,
      journalEntriesSummary,
      auditTrailSummary,
      sourceVsTarget,
    })
  } catch (error) {
    console.error("Error generating migration report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
