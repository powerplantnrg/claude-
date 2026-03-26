import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { archiveSourceData } from "@/lib/migration/rollback"

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
        reconciliations: true,
      },
    })

    if (!job) {
      return NextResponse.json({ error: "Migration job not found" }, { status: 404 })
    }

    if (!["PendingReview", "Reconciling"].includes(job.status)) {
      return NextResponse.json(
        { error: "Approval can only be done when job status is PendingReview or Reconciling" },
        { status: 400 }
      )
    }

    // Check that all reconciliations have been reviewed
    if (job.reconciliations.length === 0) {
      return NextResponse.json(
        { error: "Cannot approve: no reconciliation has been performed" },
        { status: 400 }
      )
    }

    const unreviewedReconciliations = job.reconciliations.filter(
      (r) => !r.reconciledById
    )

    if (unreviewedReconciliations.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot approve: ${unreviewedReconciliations.length} reconciliation(s) have not been reviewed`,
          unreviewedEntityTypes: unreviewedReconciliations.map((r) => r.entityType),
        },
        { status: 400 }
      )
    }

    // Set rollback deadline to 30 days from now
    const rollbackDeadline = new Date()
    rollbackDeadline.setDate(rollbackDeadline.getDate() + 30)

    // Archive source data
    archiveSourceData(job.id, job.sourceDataSnapshot as Record<string, unknown>)

    // Update job status to Completed
    const updated = await prisma.migrationJob.update({
      where: { id },
      data: {
        status: "Completed",
        approvedById: userId,
        approvedAt: new Date(),
        completedAt: new Date(),
        rollbackAvailable: true,
        rollbackDeadline,
      },
    })

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: "MigrationApproved",
        entityType: "MigrationJob",
        entityId: id,
        details: `Migration approved by user. Rollback available until ${rollbackDeadline.toISOString()}. Source data archived.`,
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      job: updated,
      rollbackDeadline: rollbackDeadline.toISOString(),
    })
  } catch (error) {
    console.error("Error approving migration:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
