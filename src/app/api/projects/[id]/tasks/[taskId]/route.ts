import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id, taskId } = await params

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

    const existing = await prisma.projectTask.findFirst({
      where: { id: taskId, projectId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
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
      sortOrder,
    } = body

    const data: any = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description
    if (assigneeId !== undefined) data.assigneeId = assigneeId || null
    if (status !== undefined) {
      data.status = status
      if (status === "Done" && !existing.completedDate) {
        data.completedDate = new Date()
      }
      if (status !== "Done") {
        data.completedDate = null
      }
    }
    if (estimatedHours !== undefined)
      data.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null
    if (budgetAmount !== undefined)
      data.budgetAmount = budgetAmount ? parseFloat(budgetAmount) : null
    if (startDate !== undefined)
      data.startDate = startDate ? new Date(startDate) : null
    if (dueDate !== undefined)
      data.dueDate = dueDate ? new Date(dueDate) : null
    if (sortOrder !== undefined) data.sortOrder = sortOrder

    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id, taskId } = await params

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

    const existing = await prisma.projectTask.findFirst({
      where: { id: taskId, projectId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Check for time entries
    const hasTimeEntries = await prisma.timeEntry.count({
      where: { taskId },
    })

    if (hasTimeEntries > 0) {
      return NextResponse.json(
        { error: "Cannot delete task with existing time entries" },
        { status: 400 }
      )
    }

    await prisma.projectTask.delete({ where: { id: taskId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
