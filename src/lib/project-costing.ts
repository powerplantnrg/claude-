import { prisma } from "./prisma"

/**
 * Calculate total project cost (time entries + expenses).
 */
export async function calculateProjectCost(projectId: string) {
  const timeEntries = await prisma.timeEntry.findMany({
    where: { projectId },
  })

  const expenses = await prisma.projectExpense.findMany({
    where: { projectId },
  })

  const timeCost = timeEntries.reduce((sum, te) => {
    return sum + (te.amount ?? te.hours * (te.hourlyRate ?? 0))
  }, 0)

  const expenseCost = expenses.reduce((sum, e) => sum + e.amount, 0)

  const totalHours = timeEntries.reduce((sum, te) => sum + te.hours, 0)

  return {
    projectId,
    timeCost,
    expenseCost,
    totalCost: timeCost + expenseCost,
    totalHours,
    timeEntryCount: timeEntries.length,
    expenseCount: expenses.length,
  }
}

/**
 * Calculate project revenue: billed (invoiced) and unbilled.
 */
export async function calculateProjectRevenue(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      milestones: true,
    },
  })

  // Billed time entries
  const billedTime = await prisma.timeEntry.findMany({
    where: { projectId, billed: true },
  })
  const billedTimeRevenue = billedTime.reduce(
    (sum, te) => sum + (te.amount ?? te.hours * (te.hourlyRate ?? 0)),
    0
  )

  // Billed expenses
  const billedExpenses = await prisma.projectExpense.findMany({
    where: { projectId, billed: true, billable: true },
  })
  const billedExpenseRevenue = billedExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Milestone revenue
  const invoicedMilestones = project.milestones.filter(
    (m) => m.status === "Invoiced" || m.status === "Paid"
  )
  const milestoneRevenue = invoicedMilestones.reduce((sum, m) => sum + m.amount, 0)

  // Unbilled time
  const unbilledTime = await prisma.timeEntry.findMany({
    where: { projectId, billed: false, billable: true },
  })
  const unbilledTimeRevenue = unbilledTime.reduce(
    (sum, te) => sum + (te.amount ?? te.hours * (te.hourlyRate ?? 0)),
    0
  )

  // Unbilled expenses
  const unbilledExpenses = await prisma.projectExpense.findMany({
    where: { projectId, billed: false, billable: true },
  })
  const unbilledExpenseRevenue = unbilledExpenses.reduce((sum, e) => sum + e.amount, 0)

  const totalBilled = billedTimeRevenue + billedExpenseRevenue + milestoneRevenue
  const totalUnbilled = unbilledTimeRevenue + unbilledExpenseRevenue

  return {
    projectId,
    billedTimeRevenue,
    billedExpenseRevenue,
    milestoneRevenue,
    totalBilled,
    unbilledTimeRevenue,
    unbilledExpenseRevenue,
    totalUnbilled,
    totalRevenue: totalBilled + totalUnbilled,
    estimatedRevenue: project.estimatedRevenue,
  }
}

/**
 * Calculate project profitability: margin analysis.
 */
export async function calculateProjectProfitability(projectId: string) {
  const cost = await calculateProjectCost(projectId)
  const revenue = await calculateProjectRevenue(projectId)

  const profit = revenue.totalBilled - cost.totalCost
  const margin = revenue.totalBilled > 0 ? (profit / revenue.totalBilled) * 100 : 0

  const potentialProfit = revenue.totalRevenue - cost.totalCost
  const potentialMargin =
    revenue.totalRevenue > 0 ? (potentialProfit / revenue.totalRevenue) * 100 : 0

  return {
    projectId,
    totalCost: cost.totalCost,
    timeCost: cost.timeCost,
    expenseCost: cost.expenseCost,
    totalHours: cost.totalHours,
    billedRevenue: revenue.totalBilled,
    unbilledRevenue: revenue.totalUnbilled,
    totalRevenue: revenue.totalRevenue,
    profit,
    margin,
    potentialProfit,
    potentialMargin,
    estimatedRevenue: revenue.estimatedRevenue,
  }
}

/**
 * Get time entries for a project that have not yet been invoiced.
 */
export async function getUnbilledTime(projectId: string) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      projectId,
      billable: true,
      billed: false,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  })

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)
  const totalAmount = entries.reduce(
    (sum, e) => sum + (e.amount ?? e.hours * (e.hourlyRate ?? 0)),
    0
  )

  return { entries, totalHours, totalAmount }
}

/**
 * Get expenses for a project that have not yet been invoiced.
 */
export async function getUnbilledExpenses(projectId: string) {
  const expenses = await prisma.projectExpense.findMany({
    where: {
      projectId,
      billable: true,
      billed: false,
    },
    orderBy: { date: "desc" },
  })

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  return { expenses, totalAmount }
}

/**
 * Get budget utilization for a project (hours and dollars).
 */
export async function getBudgetUtilization(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  })

  const cost = await calculateProjectCost(projectId)

  const budgetAmount = project.budgetAmount ?? 0
  const budgetHours = project.budgetHours ?? 0

  const dollarUtilization = budgetAmount > 0 ? (cost.totalCost / budgetAmount) * 100 : 0
  const hoursUtilization = budgetHours > 0 ? (cost.totalHours / budgetHours) * 100 : 0

  const dollarRemaining = budgetAmount - cost.totalCost
  const hoursRemaining = budgetHours - cost.totalHours

  return {
    projectId,
    projectName: project.name,
    budgetAmount,
    budgetHours,
    spentAmount: cost.totalCost,
    spentHours: cost.totalHours,
    dollarUtilization: Math.round(dollarUtilization * 100) / 100,
    hoursUtilization: Math.round(hoursUtilization * 100) / 100,
    dollarRemaining,
    hoursRemaining,
    isOverBudgetDollars: cost.totalCost > budgetAmount && budgetAmount > 0,
    isOverBudgetHours: cost.totalHours > budgetHours && budgetHours > 0,
  }
}
