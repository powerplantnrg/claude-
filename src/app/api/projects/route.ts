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
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const projectType = searchParams.get("type") || ""

    const where: any = { organizationId: orgId }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (projectType) {
      where.projectType = projectType
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true } },
        tasks: { select: { id: true, status: true } },
        timeEntries: { select: { id: true, hours: true, amount: true, billable: true, billed: true } },
        expenses: { select: { id: true, amount: true, billable: true, billed: true } },
        milestones: { select: { id: true, amount: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const projectsWithStats = projects.map((project) => {
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
      const budgetUsedPercent = project.budgetAmount
        ? Math.round((totalCost / project.budgetAmount) * 100)
        : 0
      const hoursUsedPercent = project.budgetHours
        ? Math.round((totalHours / project.budgetHours) * 100)
        : 0

      const unbilledTime = project.timeEntries
        .filter((te) => te.billable && !te.billed)
        .reduce((sum, te) => sum + (te.amount || 0), 0)
      const unbilledExpenses = project.expenses
        .filter((exp) => exp.billable && !exp.billed)
        .reduce((sum, exp) => sum + exp.amount, 0)

      return {
        id: project.id,
        name: project.name,
        code: project.code,
        description: project.description,
        status: project.status,
        projectType: project.projectType,
        billingMethod: project.billingMethod,
        startDate: project.startDate,
        endDate: project.endDate,
        budgetAmount: project.budgetAmount,
        budgetHours: project.budgetHours,
        estimatedRevenue: project.estimatedRevenue,
        hourlyRate: project.hourlyRate,
        isRdProject: project.isRdProject,
        client: project.client,
        manager: project.manager,
        taskCount: project.tasks.length,
        completedTasks: project.tasks.filter((t) => t.status === "Done").length,
        totalCost,
        totalHours,
        billableHours,
        budgetUsedPercent,
        hoursUsedPercent,
        unbilledAmount: unbilledTime + unbilledExpenses,
      }
    })

    return NextResponse.json(projectsWithStats)
  } catch (error) {
    console.error("Error fetching projects:", error)
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
    const userId = (session.user as any).id as string

    const body = await req.json()
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

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      )
    }

    // Auto-generate project code
    const count = await prisma.project.count({
      where: { organizationId: orgId },
    })
    const code = `PRJ-${String(count + 1).padStart(4, "0")}`

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        name,
        code,
        description: description || null,
        clientId: clientId || null,
        status: status || "Active",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budgetAmount: budgetAmount ? parseFloat(budgetAmount) : null,
        budgetHours: budgetHours ? parseFloat(budgetHours) : null,
        estimatedRevenue: estimatedRevenue
          ? parseFloat(estimatedRevenue)
          : null,
        projectType: projectType || "TimeAndMaterials",
        billingMethod: billingMethod || null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        managerId: managerId || userId,
        isRdProject: isRdProject || false,
        rdProjectId: rdProjectId || null,
        notes: notes || null,
      },
      include: {
        client: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "Project",
        entityId: project.id,
        details: `Created project ${code} - ${name}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
