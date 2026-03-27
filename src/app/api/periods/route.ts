import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { lockPeriod } from "@/lib/year-end"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId as string

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

    const periods = await prisma.lockedPeriod.findMany({
      where: {
        organizationId: orgId,
        ...(status ? { status } : {}),
      },
      orderBy: { periodStart: "desc" },
    })

    return NextResponse.json(periods)
  } catch (error) {
    console.error("Error fetching locked periods:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string

    const body = await req.json()
    const { periodStart, periodEnd, reason } = body

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "periodStart and periodEnd are required" },
        { status: 400 }
      )
    }

    const start = new Date(periodStart)
    const end = new Date(periodEnd)

    if (start >= end) {
      return NextResponse.json(
        { error: "periodStart must be before periodEnd" },
        { status: 400 }
      )
    }

    // Check for overlapping locked periods
    const overlapping = await prisma.lockedPeriod.findFirst({
      where: {
        organizationId: orgId,
        status: "Locked",
        OR: [
          { periodStart: { lte: end }, periodEnd: { gte: start } },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: "This period overlaps with an existing locked period" },
        { status: 409 }
      )
    }

    const period = await lockPeriod(orgId, start, end, userId, reason || "Manual period lock")

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "LockedPeriod",
        entityId: period.id,
        details: `Locked period ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}: ${reason || "Manual period lock"}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    console.error("Error locking period:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
