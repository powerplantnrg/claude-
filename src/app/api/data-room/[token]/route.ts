import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const tokenRecord = await prisma.dataRoomToken.findUnique({
    where: { token },
    include: { organization: true },
  })

  if (!tokenRecord) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!tokenRecord.isActive) {
    return NextResponse.json({ error: "Token is inactive" }, { status: 404 })
  }

  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Token has expired" }, { status: 404 })
  }

  // Update lastAccessedAt
  await prisma.dataRoomToken.update({
    where: { id: tokenRecord.id },
    data: { lastAccessedAt: new Date() },
  })

  const orgId = tokenRecord.organizationId
  const org = tokenRecord.organization

  // Fetch all data in parallel
  const [
    revenueResult,
    expenseResult,
    bankBalanceResult,
    activeProjectCount,
    rdProjects,
    rdEligibleExpenseResult,
    experiments,
    grantMilestones,
  ] = await Promise.all([
    prisma.journalLine.aggregate({
      _sum: { credit: true },
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Revenue" },
      },
    }),
    prisma.journalLine.aggregate({
      _sum: { debit: true },
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Expense" },
      },
    }),
    prisma.journalLine.aggregate({
      _sum: { debit: true, credit: true },
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Asset", subType: "Bank" },
      },
    }),
    prisma.rdProject.count({
      where: { organizationId: orgId, status: "Active" },
    }),
    prisma.rdProject.findMany({
      where: { organizationId: orgId },
      include: {
        portfolioEntry: true,
        rdExpenses: { include: { journalLine: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.journalLine.aggregate({
      _sum: { debit: true },
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Expense", isRdEligible: true },
      },
    }),
    prisma.experiment.findMany({
      where: {
        rdActivity: { rdProject: { organizationId: orgId } },
        status: "Completed",
      },
      include: {
        outcomes: true,
        rdActivity: { include: { rdProject: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.grantMilestone.findMany({
      where: {
        grant: { organizationId: orgId },
        completed: true,
      },
      include: { grant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  const totalRevenue = revenueResult._sum.credit ?? 0
  const totalExpenses = expenseResult._sum.debit ?? 0
  const netProfit = totalRevenue - totalExpenses
  const cashPosition = (bankBalanceResult._sum.debit ?? 0) - (bankBalanceResult._sum.credit ?? 0)
  const rdEligibleSpend = rdEligibleExpenseResult._sum.debit ?? 0

  // Calculate burn rate (monthly avg expenses) - approximate over 12 months
  const burnRate = totalExpenses > 0 ? totalExpenses / 12 : 0

  // R&D metrics
  const totalRdSpend = rdProjects.reduce((sum, p) => {
    return sum + p.rdExpenses.reduce((s, e) => s + (e.journalLine?.debit ?? 0), 0)
  }, 0)
  const rdIntensity = totalExpenses > 0 ? (totalRdSpend / totalExpenses) * 100 : 0
  const estimatedRdOffset = rdEligibleSpend * 0.435

  // Gross margin
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0

  // Project portfolio
  const projectPortfolio = rdProjects.map((p) => {
    const actualSpend = p.rdExpenses.reduce((s, e) => s + (e.journalLine?.debit ?? 0), 0)
    return {
      name: p.name,
      status: p.status,
      budget: p.budget,
      actualSpend,
      description: p.description,
    }
  })

  // Recent milestones
  const recentMilestones = [
    ...experiments.map((e) => ({
      type: "experiment" as const,
      title: e.name,
      project: e.rdActivity.rdProject.name,
      outcome: e.outcome,
      date: e.updatedAt,
    })),
    ...grantMilestones.map((m) => ({
      type: "grant" as const,
      title: m.title,
      project: m.grant.name,
      outcome: m.evidence,
      date: m.createdAt,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Financial year label
  const fyEnd = org.financialYearEnd
  const now = new Date()
  const fyYear = now.getMonth() + 1 > fyEnd ? now.getFullYear() + 1 : now.getFullYear()
  const financialYear = `FY${fyYear - 1}/${fyYear}`

  return NextResponse.json({
    organization: {
      name: org.name,
      abn: org.abn,
      financialYear,
    },
    financialSummary: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      netProfit,
      cashPosition,
      burnRate,
    },
    rdOverview: {
      totalRdSpend,
      activeProjects: activeProjectCount,
      rdPercentOfExpenses: rdIntensity,
      estimatedRdOffset,
    },
    keyMetrics: {
      grossMargin,
      rdIntensityRatio: rdIntensity,
    },
    projectPortfolio,
    recentMilestones,
  })
}
