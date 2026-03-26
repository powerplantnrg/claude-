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
    const userId = searchParams.get("userId") || ""
    const projectId = searchParams.get("projectId") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const billable = searchParams.get("billable")
    const approvalStatus = searchParams.get("approvalStatus") || ""

    const where: any = { organizationId: orgId }

    if (userId) where.userId = userId
    if (projectId) where.projectId = projectId
    if (approvalStatus) where.approvalStatus = approvalStatus

    if (billable !== null && billable !== "") {
      where.billable = billable === "true"
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error("Error fetching time entries:", error)
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
    const orgId = (session.user as any).organizationId
    const currentUserId = (session.user as any).id as string

    const body = await req.json()
    const {
      projectId,
      taskId,
      userId,
      date,
      hours,
      description,
      billable,
      hourlyRate,
    } = body

    if (!projectId || !date || !hours) {
      return NextResponse.json(
        { error: "Project, date, and hours are required" },
        { status: 400 }
      )
    }

    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true, hourlyRate: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const effectiveRate =
      hourlyRate !== undefined
        ? parseFloat(hourlyRate)
        : project.hourlyRate || 0
    const parsedHours = parseFloat(hours)
    const isBillable = billable !== undefined ? billable : true

    const entry = await prisma.timeEntry.create({
      data: {
        organizationId: orgId,
        projectId,
        taskId: taskId || null,
        userId: userId || currentUserId,
        date: new Date(date),
        hours: parsedHours,
        description: description || null,
        billable: isBillable,
        billed: false,
        hourlyRate: effectiveRate,
        amount: isBillable ? parsedHours * effectiveRate : 0,
        approvalStatus: "Pending",
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error("Error creating time entry:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
