import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const sourceSystem = searchParams.get("sourceSystem")
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)))

    const where: Record<string, unknown> = { organizationId: orgId }
    if (status) where.status = status
    if (sourceSystem) where.sourceSystem = sourceSystem

    const [jobs, total] = await Promise.all([
      prisma.migrationJob.findMany({
        where,
        include: {
          _count: {
            select: {
              mappings: true,
              reconciliations: true,
              journalEntries: true,
              auditLogs: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.migrationJob.count({ where }),
    ])

    return NextResponse.json({
      data: jobs,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Error listing migration jobs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { name, sourceSystem, notes } = body as {
      name?: string
      sourceSystem?: string
      notes?: string
    }

    if (!name || !sourceSystem) {
      return NextResponse.json(
        { error: "Fields 'name' and 'sourceSystem' are required" },
        { status: 400 }
      )
    }

    const validSystems = ["Xero", "MYOB", "QuickBooks", "CSV"]
    if (!validSystems.includes(sourceSystem)) {
      return NextResponse.json(
        { error: `Invalid sourceSystem. Must be one of: ${validSystems.join(", ")}` },
        { status: 400 }
      )
    }

    const job = await prisma.migrationJob.create({
      data: {
        name,
        sourceSystem,
        notes: notes ?? null,
        status: "Pending",
        organizationId: orgId,
        startedById: userId,
        startedAt: new Date(),
        totalRecords: 0,
        importedRecords: 0,
        failedRecords: 0,
        warningRecords: 0,
        skippedRecords: 0,
        rollbackAvailable: false,
      },
    })

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: job.id,
        action: "JobCreated",
        entityType: "MigrationJob",
        entityId: job.id,
        details: `Migration job '${name}' created for ${sourceSystem}`,
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error("Error creating migration job:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
