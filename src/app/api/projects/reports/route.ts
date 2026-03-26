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
    const type = searchParams.get("type") || "profitability"

    if (type === "profitability") {
      return await getProfitabilityReport(orgId)
    } else if (type === "utilization") {
      return await getUtilizationReport(orgId, searchParams)
    } else if (type === "wip") {
      return await getWipReport(orgId)
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
  } catch (error) {
    console.error("Error generating project report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function getProfitabilityReport(orgId: string) {
  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    include: {
      client: { select: { name: true } },
      timeEntries: {
        select: { hours: true, amount: true, billable: true, billed: true },
      },
      expenses: {
        select: { amount: true, billable: true, billed: true },
      },
      milestones: {
        select: { amount: true, status: true },
      },
    },
  })

  const report = projects.map((project) => {
    const totalTimeCost = project.timeEntries.reduce(
      (sum, te) => sum + (te.amount || 0),
      0
    )
    const totalExpenseCost = project.expenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    )
    const totalCost = totalTimeCost + totalExpenseCost

    const billedTimeRevenue = project.timeEntries
      .filter((te) => te.billed)
      .reduce((sum, te) => sum + (te.amount || 0), 0)
    const milestoneRevenue = project.milestones
      .filter((m) => m.status === "Paid")
      .reduce((sum, m) => sum + (m.amount || 0), 0)
    const revenue = billedTimeRevenue + milestoneRevenue

    const totalHours = project.timeEntries.reduce(
      (sum, te) => sum + te.hours,
      0
    )
    const billableHours = project.timeEntries
      .filter((te) => te.billable)
      .reduce((sum, te) => sum + te.hours, 0)

    return {
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      projectType: project.projectType,
      clientName: project.client?.name || "No Client",
      budgetAmount: project.budgetAmount,
      totalCost,
      totalTimeCost,
      totalExpenseCost,
      revenue,
      profit: revenue - totalCost,
      margin: revenue > 0 ? Math.round(((revenue - totalCost) / revenue) * 100) : 0,
      totalHours,
      billableHours,
      budgetUsedPercent: project.budgetAmount
        ? Math.round((totalCost / project.budgetAmount) * 100)
        : 0,
    }
  })

  const totals = {
    totalCost: report.reduce((s, r) => s + r.totalCost, 0),
    totalRevenue: report.reduce((s, r) => s + r.revenue, 0),
    totalProfit: report.reduce((s, r) => s + r.profit, 0),
    totalHours: report.reduce((s, r) => s + r.totalHours, 0),
    totalBillableHours: report.reduce((s, r) => s + r.billableHours, 0),
  }

  return NextResponse.json({ projects: report, totals })
}

async function getUtilizationReport(
  orgId: string,
  searchParams: URLSearchParams
) {
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  const dateFilter: any = {}
  if (startDate) dateFilter.gte = new Date(startDate)
  if (endDate) dateFilter.lte = new Date(endDate)

  const where: any = { organizationId: orgId }
  if (startDate || endDate) where.date = dateFilter

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  })

  // Group by user
  const userMap: Record<
    string,
    {
      user: { id: string; name: string | null; email: string }
      totalHours: number
      billableHours: number
      nonBillableHours: number
      projects: Set<string>
    }
  > = {}

  for (const entry of entries) {
    if (!userMap[entry.userId]) {
      userMap[entry.userId] = {
        user: entry.user,
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        projects: new Set(),
      }
    }
    const u = userMap[entry.userId]
    u.totalHours += entry.hours
    if (entry.billable) {
      u.billableHours += entry.hours
    } else {
      u.nonBillableHours += entry.hours
    }
    u.projects.add(entry.project.name)
  }

  const users = Object.values(userMap).map((u) => ({
    ...u.user,
    totalHours: Math.round(u.totalHours * 100) / 100,
    billableHours: Math.round(u.billableHours * 100) / 100,
    nonBillableHours: Math.round(u.nonBillableHours * 100) / 100,
    utilizationRate:
      u.totalHours > 0
        ? Math.round((u.billableHours / u.totalHours) * 100)
        : 0,
    projectCount: u.projects.size,
  }))

  const totalHours = users.reduce((s, u) => s + u.totalHours, 0)
  const totalBillable = users.reduce((s, u) => s + u.billableHours, 0)

  return NextResponse.json({
    users,
    totals: {
      totalHours,
      totalBillable,
      totalNonBillable: totalHours - totalBillable,
      overallUtilization:
        totalHours > 0 ? Math.round((totalBillable / totalHours) * 100) : 0,
    },
  })
}

async function getWipReport(orgId: string) {
  const projects = await prisma.project.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["Active", "InProgress"] },
    },
    include: {
      client: { select: { name: true } },
      timeEntries: {
        where: { billable: true, billed: false },
        select: { hours: true, amount: true, date: true },
      },
      expenses: {
        where: { billable: true, billed: false },
        select: { amount: true, date: true, description: true },
      },
    },
  })

  const report = projects
    .map((project) => {
      const unbilledTimeAmount = project.timeEntries.reduce(
        (sum, te) => sum + (te.amount || 0),
        0
      )
      const unbilledTimeHours = project.timeEntries.reduce(
        (sum, te) => sum + te.hours,
        0
      )
      const unbilledExpenseAmount = project.expenses.reduce(
        (sum, exp) => sum + exp.amount,
        0
      )

      const oldestUnbilledTime =
        project.timeEntries.length > 0
          ? project.timeEntries.reduce((oldest, te) =>
              te.date < oldest.date ? te : oldest
            ).date
          : null

      return {
        id: project.id,
        name: project.name,
        code: project.code,
        clientName: project.client?.name || "No Client",
        unbilledTimeHours: Math.round(unbilledTimeHours * 100) / 100,
        unbilledTimeAmount,
        unbilledExpenseAmount,
        totalUnbilled: unbilledTimeAmount + unbilledExpenseAmount,
        unbilledTimeEntries: project.timeEntries.length,
        unbilledExpenseEntries: project.expenses.length,
        oldestUnbilledDate: oldestUnbilledTime,
      }
    })
    .filter((p) => p.totalUnbilled > 0)
    .sort((a, b) => b.totalUnbilled - a.totalUnbilled)

  const totals = {
    totalUnbilledTime: report.reduce((s, r) => s + r.unbilledTimeAmount, 0),
    totalUnbilledExpenses: report.reduce(
      (s, r) => s + r.unbilledExpenseAmount,
      0
    ),
    totalUnbilled: report.reduce((s, r) => s + r.totalUnbilled, 0),
    projectCount: report.length,
  }

  return NextResponse.json({ projects: report, totals })
}
