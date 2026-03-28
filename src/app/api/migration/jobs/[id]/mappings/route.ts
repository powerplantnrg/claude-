import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
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
    })

    if (!job) {
      return NextResponse.json({ error: "Migration job not found" }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get("entityType")
    const status = searchParams.get("status")
    const requiresReview = searchParams.get("requiresReview")
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))

    const where: Record<string, unknown> = { migrationJobId: id }
    if (entityType) where.entityType = entityType
    if (status) where.status = status
    if (requiresReview !== null && requiresReview !== undefined) {
      where.requiresReview = requiresReview === "true"
    }

    const [mappings, total] = await Promise.all([
      prisma.migrationMapping.findMany({
        where,
        orderBy: [{ entityType: "asc" }, { sourceCode: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.migrationMapping.count({ where }),
    ])

    return NextResponse.json({
      data: mappings,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Error listing migration mappings:", error)
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

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { mappingIds, action, targetId, targetEntityType, mappingNotes } = body as {
      mappingIds?: string[]
      action?: string
      targetId?: string
      targetEntityType?: string
      mappingNotes?: string
    }

    if (!mappingIds || !Array.isArray(mappingIds) || mappingIds.length === 0) {
      return NextResponse.json(
        { error: "Field 'mappingIds' must be a non-empty array" },
        { status: 400 }
      )
    }

    if (!action) {
      return NextResponse.json(
        { error: "Field 'action' is required (approve, skip, map, flag)" },
        { status: 400 }
      )
    }

    const validActions = ["approve", "skip", "map", "flag"]
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}

    switch (action) {
      case "approve":
        data.status = "Approved"
        data.requiresReview = false
        data.reviewedById = userId
        data.reviewedAt = new Date()
        break
      case "skip":
        data.status = "Skipped"
        data.requiresReview = false
        data.reviewedById = userId
        data.reviewedAt = new Date()
        break
      case "map":
        if (!targetId) {
          return NextResponse.json(
            { error: "Field 'targetId' is required for 'map' action" },
            { status: 400 }
          )
        }
        data.targetId = targetId
        data.targetEntityType = targetEntityType || null
        data.status = "Mapped"
        break
      case "flag":
        data.requiresReview = true
        data.status = "PendingReview"
        break
    }

    if (mappingNotes !== undefined) {
      data.mappingNotes = mappingNotes
    }

    const result = await prisma.migrationMapping.updateMany({
      where: {
        id: { in: mappingIds },
        migrationJobId: id,
      },
      data,
    })

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: `BulkMapping_${action}`,
        entityType: "MigrationMapping",
        entityId: mappingIds.join(","),
        details: `Bulk ${action} applied to ${result.count} mapping(s)`,
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      action,
      updatedCount: result.count,
    })
  } catch (error) {
    console.error("Error updating migration mappings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
