import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { reverseYearEndClose } from "@/lib/year-end"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId as string
    const { id } = await params

    const yearEndClose = await prisma.yearEndClose.findFirst({
      where: { id, organizationId: orgId },
      include: {
        closedBy: { select: { id: true, name: true, email: true } },
        retainedEarningsEntry: {
          include: {
            lines: { include: { account: true } },
          },
        },
      },
    })

    if (!yearEndClose) {
      return NextResponse.json({ error: "Year-end close not found" }, { status: 404 })
    }

    // Fetch locked periods for this FY
    const fy = yearEndClose.financialYear
    const fyNum = parseInt(fy, 10)
    const fyStart = new Date(fyNum - 1, 6, 1)
    const fyEnd = new Date(fyNum, 5, 30, 23, 59, 59)

    const lockedPeriods = await prisma.lockedPeriod.findMany({
      where: {
        organizationId: orgId,
        periodStart: { gte: fyStart },
        periodEnd: { lte: fyEnd },
      },
      orderBy: { periodStart: "asc" },
    })

    return NextResponse.json({
      ...yearEndClose,
      lockedPeriods,
    })
  } catch (error) {
    console.error("Error fetching year-end close:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
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

    const body = await req.json()
    const { action } = body

    if (action !== "reverse") {
      return NextResponse.json(
        { error: "Only 'reverse' action is supported" },
        { status: 400 }
      )
    }

    const existing = await prisma.yearEndClose.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Year-end close not found" }, { status: 404 })
    }

    if (existing.status !== "Completed") {
      return NextResponse.json(
        { error: "Only completed year-end closes can be reversed" },
        { status: 400 }
      )
    }

    const reversed = await reverseYearEndClose(id, userId)

    const existingFyNum = parseInt(existing.financialYear, 10)
    await prisma.auditLog.create({
      data: {
        userId,
        action: "Update",
        entityType: "YearEndClose",
        entityId: id,
        details: `Reversed year-end close for FY ${existingFyNum - 1}/${existingFyNum}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(reversed)
  } catch (error) {
    console.error("Error reversing year-end close:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
