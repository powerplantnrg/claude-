import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const project = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const tasks = await prisma.projectTask.findMany({
      where: { projectId: id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        timeEntries: { select: { id: true, hours: true, amount: true } },
      },
      orderBy: { sortOrder: "asc" },
    })

    const tasksWithStats = tasks.map((task) => ({
      ...task,
      totalHours: task.timeEntries.reduce((sum, te) => sum + te.hours, 0),
      totalCost: task.timeEntries.reduce(
        (sum, te) => sum + (te.amount || 0),
        0
      ),
      timeEntryCount: task.timeEntries.length,
    }))

    return NextResponse.json(tasksWithStats)
  } catch (error) {
    console.error("Error fetching project tasks:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const project = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      assigneeId,
      status,
      estimatedHours,
      budgetAmount,
      startDate,
      dueDate,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Task name is required" },
        { status: 400 }
      )
    }

    // Get next sort order
    const lastTask = await prisma.projectTask.findFirst({
      where: { projectId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    })
    const sortOrder = (lastTask?.sortOrder || 0) + 1

    const task = await prisma.projectTask.create({
      data: {
        projectId: id,
        name,
        description: description || null,
        assigneeId: assigneeId || null,
        status: status || "Todo",
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        budgetAmount: budgetAmount ? parseFloat(budgetAmount) : null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        sortOrder,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Error creating project task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
