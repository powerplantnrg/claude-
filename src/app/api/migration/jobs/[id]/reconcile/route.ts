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

    // Run all reconciliation checks via the library
    const accountResult = await reconcileAccounts(id)
    const contactResult = await reconcileContactCounts(id)
    const transactionResults = await reconcileTransactionTotals(id)

    const reconciliationResults = [
      accountResult,
      contactResult,
      ...transactionResults,
    ]

    // Flag variances with 1% tolerance
    const flaggedItems = await flagVariances(id, 1)

    // Generate report
    const report = await generateReconciliationReport(id)

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: "ReconciliationComplete",
        entityType: "MigrationJob",
        entityId: id,
        details: `Reconciliation complete: ${reconciliationResults.length} entity types reconciled. Variances: ${reconciliationResults.filter((r) => r.status === "Variance").length}. Flagged: ${flaggedItems.length}`,
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
