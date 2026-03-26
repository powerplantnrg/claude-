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
      include: {
        client: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
        timeEntries: {
          include: {
            user: { select: { id: true, name: true } },
            task: { select: { id: true, name: true } },
          },
          orderBy: { date: "desc" },
        },
        expenses: {
          include: {
            approvedBy: { select: { id: true, name: true } },
          },
          orderBy: { date: "desc" },
        },
        milestones: {
          orderBy: { dueDate: "asc" },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Calculate summary stats
    const totalTimeCost = project.timeEntries.reduce(
      (sum, te) => sum + (te.amount || 0),
      0
    )
    const totalExpenseCost = project.expenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    )
    const totalCost = totalTimeCost + totalExpenseCost
    const totalHours = project.timeEntries.reduce(
      (sum, te) => sum + te.hours,
      0
    )
    const billableHours = project.timeEntries
      .filter((te) => te.billable)
      .reduce((sum, te) => sum + te.hours, 0)
    const billedAmount = project.timeEntries
      .filter((te) => te.billed)
      .reduce((sum, te) => sum + (te.amount || 0), 0)
    const unbilledTimeAmount = project.timeEntries
      .filter((te) => te.billable && !te.billed)
      .reduce((sum, te) => sum + (te.amount || 0), 0)
    const unbilledExpenseAmount = project.expenses
      .filter((exp) => exp.billable && !exp.billed)
      .reduce((sum, exp) => sum + exp.amount, 0)

    const revenue = billedAmount + (project.milestones
      .filter((m) => m.status === "Paid")
      .reduce((sum, m) => sum + (m.amount || 0), 0))

    const profitability = {
      totalCost,
      totalTimeCost,
      totalExpenseCost,
      revenue,
      profit: revenue - totalCost,
      margin: revenue > 0 ? Math.round(((revenue - totalCost) / revenue) * 100) : 0,
      unbilledAmount: unbilledTimeAmount + unbilledExpenseAmount,
    }

    const timeSummary = {
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      budgetHours: project.budgetHours,
      hoursUsedPercent: project.budgetHours
        ? Math.round((totalHours / project.budgetHours) * 100)
        : 0,
    }

    const budgetSummary = {
      budgetAmount: project.budgetAmount,
      totalCost,
      budgetUsedPercent: project.budgetAmount
        ? Math.round((totalCost / project.budgetAmount) * 100)
        : 0,
      remaining: project.budgetAmount
        ? project.budgetAmount - totalCost
        : null,
    }

    return NextResponse.json({
      ...project,
      profitability,
      timeSummary,
      budgetSummary,
    })
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
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

    const existing = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      clientId,
      status,
      startDate,
      endDate,
      budgetAmount,
      budgetHours,
      estimatedRevenue,
      projectType,
      billingMethod,
      hourlyRate,
      managerId,
      isRdProject,
      rdProjectId,
      notes,
    } = body

    const data: any = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description
    if (clientId !== undefined) data.clientId = clientId || null
    if (status !== undefined) data.status = status
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null
    if (budgetAmount !== undefined) data.budgetAmount = budgetAmount ? parseFloat(budgetAmount) : null
    if (budgetHours !== undefined) data.budgetHours = budgetHours ? parseFloat(budgetHours) : null
    if (estimatedRevenue !== undefined) data.estimatedRevenue = estimatedRevenue ? parseFloat(estimatedRevenue) : null
    if (projectType !== undefined) data.projectType = projectType
    if (billingMethod !== undefined) data.billingMethod = billingMethod
    if (hourlyRate !== undefined) data.hourlyRate = hourlyRate ? parseFloat(hourlyRate) : null
    if (managerId !== undefined) data.managerId = managerId || null
    if (isRdProject !== undefined) data.isRdProject = isRdProject
    if (rdProjectId !== undefined) data.rdProjectId = rdProjectId || null
    if (notes !== undefined) data.notes = notes

    const project = await prisma.project.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Update",
        entityType: "Project",
        entityId: project.id,
        details: `Updated project ${project.code} - ${project.name}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
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

    const existing = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Check for time entries or expenses before deleting
    const hasTimeEntries = await prisma.timeEntry.count({
      where: { projectId: id },
    })
    const hasExpenses = await prisma.projectExpense.count({
      where: { projectId: id },
    })

    if (hasTimeEntries > 0 || hasExpenses > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete project with existing time entries or expenses. Archive it instead.",
        },
        { status: 400 }
      )
    }

    // Delete related records first
    await prisma.projectMilestone.deleteMany({ where: { projectId: id } })
    await prisma.projectTask.deleteMany({ where: { projectId: id } })
    await prisma.project.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Delete",
        entityType: "Project",
        entityId: id,
        details: `Deleted project ${existing.code} - ${existing.name}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
