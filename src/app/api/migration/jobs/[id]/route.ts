import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const job = await prisma.migrationJob.findFirst({
      where: { id, organizationId: orgId },
      include: {
        mappings: {
          select: {
            entityType: true,
            status: true,
          },
        },
        reconciliations: true,
        _count: {
          select: {
            auditLogs: true,
            journalEntries: true,
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: "Migration job not found" }, { status: 404 })
    }

    // Build mapping counts by entity type and status
    const mappingCounts: Record<string, Record<string, number>> = {}
    for (const mapping of job.mappings) {
      if (!mappingCounts[mapping.entityType]) {
        mappingCounts[mapping.entityType] = {}
      }
      mappingCounts[mapping.entityType][mapping.status] =
        (mappingCounts[mapping.entityType][mapping.status] || 0) + 1
    }

    // Build reconciliation summary
    const reconciliationSummary = job.reconciliations.map((r) => ({
      entityType: r.entityType,
      sourceTotal: r.sourceTotal,
      importedTotal: r.importedTotal,
      variance: r.variance,
      variancePercentage: r.variancePercentage,
      status: r.status,
    }))

    const { mappings: _mappings, reconciliations: _reconciliations, ...jobData } = job

    return NextResponse.json({
      ...jobData,
      mappingCounts,
      totalMappings: job.mappings.length,
      reconciliationSummary,
    })
  } catch (error) {
    console.error("Error fetching migration job:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
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

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { status, notes } = body as {
      status?: string
      notes?: string
    }

    const data: Record<string, unknown> = {}

    if (status) {
      const validTransitions: Record<string, string[]> = {
        Pending: ["Validating"],
        Validating: ["Importing", "Pending"],
        Importing: ["Transforming"],
        Transforming: ["Reconciling"],
        Reconciling: ["PendingReview"],
        PendingReview: ["Approved", "Rejected"],
        Rejected: ["Pending"],
      }

      const allowed = validTransitions[job.status]
      if (!allowed || !allowed.includes(status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from '${job.status}' to '${status}'. Allowed transitions: ${(allowed || []).join(", ") || "none"}`,
          },
          { status: 400 }
        )
      }

      data.status = status

      if (status === "Approved") {
        data.approvedById = userId
        data.approvedAt = new Date()
      }

      if (status === "Completed" || status === "Rejected") {
        data.completedAt = new Date()
      }
    }

    if (notes !== undefined) {
      data.notes = notes
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const updated = await prisma.migrationJob.update({
      where: { id },
      data,
    })

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: status ? `StatusChanged_${status}` : "JobUpdated",
        entityType: "MigrationJob",
        entityId: id,
        details: status
          ? `Job status changed from '${job.status}' to '${status}'`
          : "Job details updated",
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating migration job:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id as string
    const { id } = await params

    const job = await prisma.migrationJob.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!job) {
      return NextResponse.json({ error: "Migration job not found" }, { status: 404 })
    }

    if (job.status !== "Pending") {
      return NextResponse.json(
        { error: "Only migration jobs with 'Pending' status can be deleted" },
        { status: 400 }
      )
    }

    // Delete related records first
    await prisma.migrationAuditLog.deleteMany({ where: { migrationJobId: id } })
    await prisma.migrationMapping.deleteMany({ where: { migrationJobId: id } })
    await prisma.migrationRule.deleteMany({ where: { migrationJobId: id } })
    await prisma.migrationReconciliation.deleteMany({ where: { migrationJobId: id } })
    await prisma.migrationJournalEntry.deleteMany({ where: { migrationJobId: id } })
    await prisma.migrationJob.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting migration job:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
