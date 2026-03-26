import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const now = new Date()

  // Fetch data in parallel
  const [
    journalLines,
    bankBalance,
    cloudCosts,
    tokenUsage,
    invoices,
    bills,
    contacts,
    rdProjects,
    rdEligibleExpenses,
    claimDrafts,
  ] = await Promise.all([
    prisma.journalLine.findMany({
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
      },
      include: {
        account: true,
        journalEntry: { select: { date: true } },
      },
    }),
    prisma.bankTransaction.aggregate({
      _sum: { amount: true },
      where: { organizationId: orgId },
    }),
    prisma.cloudCostEntry.findMany({
      where: { provider: { organizationId: orgId } },
      include: { provider: true },
    }),
    prisma.tokenUsage.findMany({
      where: { provider: { organizationId: orgId } },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId },
      include: { contact: true, payments: true },
    }),
    prisma.bill.findMany({
      where: { organizationId: orgId },
    }),
    prisma.contact.findMany({
      where: { organizationId: orgId, contactType: "Customer" },
    }),
    prisma.rdProject.findMany({
      where: { organizationId: orgId, status: "Active" },
      include: {
        rdExpenses: { include: { journalLine: true } },
        activities: { include: { timeEntries: true } },
      },
    }),
    prisma.journalLine.aggregate({
      _sum: { debit: true },
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Expense", isRdEligible: true },
      },
    }),
    prisma.rdClaimDraft.findMany({
      orderBy: { financialYear: "asc" },
    }),
  ])

  // ==================
  // Unit Economics
  // ==================
  const totalRevenue = journalLines
    .filter((l) => l.account.type === "Revenue")
    .reduce((sum, l) => sum + l.credit, 0)

  const totalExpenses = journalLines
    .filter((l) => l.account.type === "Expense")
    .reduce((sum, l) => sum + l.debit, 0)

  const totalCloudCosts = cloudCosts.reduce((sum, c) => sum + c.amount, 0)
  const totalApiCalls = tokenUsage.reduce(
    (sum, t) => sum + t.inputTokens + t.outputTokens,
    0
  )
  const costPerApiCall = totalApiCalls > 0 ? totalCloudCosts / totalApiCalls : 0
  const customerCount = contacts.length || 1
  const revenuePerCustomer = totalRevenue / customerCount

  const totalRdSpend = rdProjects.reduce((projSum, proj) => {
    const expenseSpend = proj.rdExpenses.reduce(
      (sum, exp) => sum + (exp.journalLine.debit || 0),
      0
    )
    const timeSpend = proj.activities.reduce(
      (actSum, act) =>
        actSum +
        act.timeEntries.reduce(
          (teSum, te) => teSum + te.hours * (te.hourlyRate || 0),
          0
        ),
      0
    )
    return projSum + expenseSpend + timeSpend
  }, 0)

  const rdEligible = rdEligibleExpenses._sum.debit ?? 0
  const estimatedTaxOffset = rdEligible * 0.435
  const rdRoi = totalRdSpend > 0 ? (estimatedTaxOffset / totalRdSpend) * 100 : 0

  const cloudCostPctRevenue =
    totalRevenue > 0 ? (totalCloudCosts / totalRevenue) * 100 : 0

  const cogs = totalCloudCosts // simplified: COGS = cloud costs for AI products
  const grossMargin =
    totalRevenue > 0 ? ((totalRevenue - cogs) / totalRevenue) * 100 : 0

  // ==================
  // Monthly trends (last 6 months)
  // ==================
  const monthLabels: { label: string; start: Date; end: Date }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const label = d.toLocaleDateString("en-AU", {
      month: "short",
      year: "2-digit",
    })
    monthLabels.push({ label, start: d, end })
  }

  const monthlyTrends = monthLabels.map((m) => {
    const revenue = journalLines
      .filter(
        (l) =>
          l.account.type === "Revenue" &&
          new Date(l.journalEntry.date) >= m.start &&
          new Date(l.journalEntry.date) <= m.end
      )
      .reduce((sum, l) => sum + l.credit, 0)

    const expenses = journalLines
      .filter(
        (l) =>
          l.account.type === "Expense" &&
          new Date(l.journalEntry.date) >= m.start &&
          new Date(l.journalEntry.date) <= m.end
      )
      .reduce((sum, l) => sum + l.debit, 0)

    const cloud = cloudCosts
      .filter(
        (c) => new Date(c.date) >= m.start && new Date(c.date) <= m.end
      )
      .reduce((sum, c) => sum + c.amount, 0)

    const mCustomers = new Set(
      invoices
        .filter(
          (inv) =>
            new Date(inv.date) >= m.start && new Date(inv.date) <= m.end
        )
        .map((inv) => inv.contactId)
    ).size

    return {
      month: m.label,
      revenue,
      expenses,
      cloudCosts: cloud,
      grossMargin: revenue > 0 ? ((revenue - cloud) / revenue) * 100 : 0,
      revenuePerCustomer: mCustomers > 0 ? revenue / mCustomers : 0,
    }
  })

  // ==================
  // Expense Breakdown
  // ==================
  const expenseByCategory: Record<
    string,
    { amount: number; subCategories: Record<string, number> }
  > = {}

  for (const line of journalLines) {
    if (line.account.type !== "Expense") continue
    const category = classifyExpenseCategory(line.account.name, line.account.subType)
    const subCategory = line.account.name

    if (!expenseByCategory[category]) {
      expenseByCategory[category] = { amount: 0, subCategories: {} }
    }
    expenseByCategory[category].amount += line.debit
    expenseByCategory[category].subCategories[subCategory] =
      (expenseByCategory[category].subCategories[subCategory] || 0) + line.debit
  }

  // Add cloud costs as a category
  if (totalCloudCosts > 0) {
    const cloudCategory = expenseByCategory["Cloud"] || {
      amount: 0,
      subCategories: {},
    }
    for (const cost of cloudCosts) {
      cloudCategory.amount += cost.amount
      const service = cost.service || "Other"
      cloudCategory.subCategories[service] =
        (cloudCategory.subCategories[service] || 0) + cost.amount
    }
    expenseByCategory["Cloud"] = cloudCategory
  }

  const expenseBreakdown = Object.entries(expenseByCategory)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      pctOfTotal: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
      subCategories: Object.entries(data.subCategories).map(
        ([name, amount]) => ({
          name,
          amount,
        })
      ),
    }))
    .sort((a, b) => b.amount - a.amount)

  // ==================
  // Revenue Analytics
  // ==================
  const revenueByCustomer: Record<string, { name: string; amount: number }> = {}
  for (const inv of invoices) {
    const name = inv.contact.name
    if (!revenueByCustomer[inv.contactId]) {
      revenueByCustomer[inv.contactId] = { name, amount: 0 }
    }
    revenueByCustomer[inv.contactId].amount += inv.total
  }
  const topCustomers = Object.values(revenueByCustomer)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Invoice collection rate
  const paidInvoices = invoices.filter((inv) => inv.status === "Paid")
  const overdueInvoices = invoices.filter(
    (inv) =>
      inv.status !== "Paid" &&
      inv.status !== "Draft" &&
      inv.status !== "Void" &&
      new Date(inv.dueDate) < now
  )
  const totalApprovedInvoices = invoices.filter(
    (inv) => inv.status !== "Draft" && inv.status !== "Void"
  ).length
  const paidOnTimeRate =
    totalApprovedInvoices > 0
      ? (paidInvoices.length / totalApprovedInvoices) * 100
      : 0
  const overdueRate =
    totalApprovedInvoices > 0
      ? (overdueInvoices.length / totalApprovedInvoices) * 100
      : 0

  // Average days to payment
  const daysToPayment: number[] = []
  for (const inv of paidInvoices) {
    if (inv.payments.length > 0) {
      const lastPayment = inv.payments.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
      const days = Math.round(
        (new Date(lastPayment.date).getTime() -
          new Date(inv.date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      daysToPayment.push(days)
    }
  }
  const avgDaysToPayment =
    daysToPayment.length > 0
      ? daysToPayment.reduce((a, b) => a + b, 0) / daysToPayment.length
      : 0

  // MRR from recurring invoices (approximation from monthly invoices)
  const monthlyRevenueTrend = monthLabels.map((m) => {
    const monthRevenue = invoices
      .filter(
        (inv) =>
          new Date(inv.date) >= m.start &&
          new Date(inv.date) <= m.end &&
          inv.status !== "Draft" &&
          inv.status !== "Void"
      )
      .reduce((sum, inv) => sum + inv.total, 0)
    return { month: m.label, mrr: monthRevenue }
  })

  // ==================
  // Cash Flow Waterfall
  // ==================
  const cashBalance = bankBalance._sum.amount ?? 0

  const operatingExpenses = journalLines
    .filter(
      (l) =>
        l.account.type === "Expense" &&
        !l.account.isRdEligible &&
        !l.account.name.toLowerCase().includes("cloud")
    )
    .reduce((sum, l) => sum + l.debit, 0)

  const rdCosts = totalRdSpend
  const startingCash = cashBalance - totalRevenue + totalExpenses // approximation

  const waterfall = {
    startingCash: Math.max(startingCash, 0),
    revenue: totalRevenue,
    operatingExpenses,
    rdCosts,
    cloudCosts: totalCloudCosts,
    rdTaxOffset: estimatedTaxOffset,
    endingCash: cashBalance,
  }

  return NextResponse.json({
    unitEconomics: {
      costPerApiCall,
      revenuePerCustomer,
      rdRoi,
      cloudCostPctRevenue,
      grossMargin,
      customerAcquisitionCost: 0, // placeholder
    },
    monthlyTrends,
    expenseBreakdown,
    revenueAnalytics: {
      topCustomers,
      paidOnTimeRate,
      overdueRate,
      avgDaysToPayment,
      monthlyRevenueTrend,
    },
    waterfall,
  })
}

function classifyExpenseCategory(
  accountName: string,
  subType: string | null
): string {
  const name = accountName.toLowerCase()
  const sub = (subType || "").toLowerCase()

  if (
    name.includes("salary") ||
    name.includes("wage") ||
    name.includes("staff") ||
    name.includes("payroll") ||
    sub.includes("payroll")
  ) {
    return "Staff"
  }
  if (
    name.includes("cloud") ||
    name.includes("aws") ||
    name.includes("azure") ||
    name.includes("hosting") ||
    name.includes("server")
  ) {
    return "Cloud"
  }
  if (
    name.includes("r&d") ||
    name.includes("research") ||
    name.includes("development") ||
    name.includes("experiment")
  ) {
    return "R&D"
  }
  if (
    name.includes("rent") ||
    name.includes("utilities") ||
    name.includes("insurance") ||
    name.includes("office")
  ) {
    return "Facilities"
  }
  if (
    name.includes("marketing") ||
    name.includes("advertising") ||
    name.includes("promotion")
  ) {
    return "Marketing"
  }
  if (
    name.includes("software") ||
    name.includes("subscription") ||
    name.includes("license")
  ) {
    return "Software"
  }
  return "Operating"
}
