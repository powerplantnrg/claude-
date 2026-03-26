import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Investor Data Room",
}

interface DataRoomData {
  organization: {
    name: string
    abn: string | null
    financialYear: string
  }
  financialSummary: {
    revenue: number
    expenses: number
    netProfit: number
    cashPosition: number
    burnRate: number
  }
  rdOverview: {
    totalRdSpend: number
    activeProjects: number
    rdPercentOfExpenses: number
    estimatedRdOffset: number
  }
  keyMetrics: {
    grossMargin: number
    rdIntensityRatio: number
    runway: number | null
  }
  projectPortfolio: {
    name: string
    status: string
    budget: number | null
    actualSpend: number
    description: string | null
  }[]
  recentMilestones: {
    type: "experiment" | "grant"
    title: string
    project: string
    outcome: string | null
    date: string
  }[]
}

async function getDataRoomData(token: string): Promise<DataRoomData | null> {
  const tokenRecord = await prisma.dataRoomToken.findUnique({
    where: { token },
    include: { organization: true },
  })

  if (!tokenRecord || !tokenRecord.isActive) return null
  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) return null

  // Update lastAccessedAt
  await prisma.dataRoomToken.update({
    where: { id: tokenRecord.id },
    data: { lastAccessedAt: new Date() },
  })

  const orgId = tokenRecord.organizationId
  const org = tokenRecord.organization

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
  const burnRate = totalExpenses > 0 ? totalExpenses / 12 : 0
  const rdEligibleSpend = rdEligibleExpenseResult._sum.debit ?? 0

  const totalRdSpend = rdProjects.reduce((sum, p) => {
    return sum + p.rdExpenses.reduce((s, e) => s + (e.journalLine?.debit ?? 0), 0)
  }, 0)
  const rdIntensity = totalExpenses > 0 ? (totalRdSpend / totalExpenses) * 100 : 0
  const estimatedRdOffset = rdEligibleSpend * 0.435
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
  const runway = burnRate > 0 ? Math.floor(cashPosition / burnRate) : null

  const fyEnd = org.financialYearEnd
  const now = new Date()
  const fyYear = now.getMonth() + 1 > fyEnd ? now.getFullYear() + 1 : now.getFullYear()
  const financialYear = `FY${fyYear - 1}/${fyYear}`

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

  const recentMilestones = [
    ...experiments.map((e) => ({
      type: "experiment" as const,
      title: e.name,
      project: e.rdActivity.rdProject.name,
      outcome: e.outcome,
      date: e.updatedAt.toISOString(),
    })),
    ...grantMilestones.map((m) => ({
      type: "grant" as const,
      title: m.title,
      project: m.grant.name,
      outcome: m.evidence,
      date: m.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    organization: { name: org.name, abn: org.abn, financialYear },
    financialSummary: { revenue: totalRevenue, expenses: totalExpenses, netProfit, cashPosition, burnRate },
    rdOverview: { totalRdSpend, activeProjects: activeProjectCount, rdPercentOfExpenses: rdIntensity, estimatedRdOffset },
    keyMetrics: { grossMargin, rdIntensityRatio: rdIntensity, runway },
    projectPortfolio,
    recentMilestones,
  }
}

export default async function PublicDataRoomPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getDataRoomData(token)

  if (!data) {
    notFound()
  }

  const { organization, financialSummary, rdOverview, keyMetrics, projectPortfolio, recentMilestones } = data

  const statusColors: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700",
    Completed: "bg-slate-100 text-slate-700",
    "On Hold": "bg-amber-100 text-amber-700",
    Pending: "bg-blue-100 text-blue-700",
    Cancelled: "bg-red-100 text-red-700",
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{organization.name}</h1>
              <p className="text-sm text-slate-500">Investor Data Room</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {/* Company Overview */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Company Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Organization</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{organization.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">ABN</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{organization.abn || "Not set"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Financial Year</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{organization.financialYear}</p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Financial Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Revenue (YTD)</p>
              <p className="mt-2 text-xl font-bold text-indigo-700">{formatCurrency(financialSummary.revenue)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Expenses (YTD)</p>
              <p className="mt-2 text-xl font-bold text-rose-700">{formatCurrency(financialSummary.expenses)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net Profit</p>
              <p className={`mt-2 text-xl font-bold ${financialSummary.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {formatCurrency(financialSummary.netProfit)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cash Position</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(financialSummary.cashPosition)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Burn Rate (Monthly)</p>
              <p className="mt-2 text-xl font-bold text-amber-700">{formatCurrency(financialSummary.burnRate)}</p>
            </div>
          </div>
        </div>

        {/* R&D Overview */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">R&D Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total R&D Spend</p>
              <p className="mt-2 text-xl font-bold text-violet-700">{formatCurrency(rdOverview.totalRdSpend)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Projects</p>
              <p className="mt-2 text-xl font-bold text-indigo-700">{rdOverview.activeProjects}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">R&D % of Expenses</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{rdOverview.rdPercentOfExpenses.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Est. R&D Tax Offset</p>
              <p className="mt-2 text-xl font-bold text-emerald-700">{formatCurrency(rdOverview.estimatedRdOffset)}</p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Gross Margin</p>
              <p className={`mt-2 text-xl font-bold ${keyMetrics.grossMargin >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {keyMetrics.grossMargin.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">R&D Intensity Ratio</p>
              <p className="mt-2 text-xl font-bold text-violet-700">{keyMetrics.rdIntensityRatio.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Runway (Months)</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{keyMetrics.runway ?? "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Project Portfolio */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Project Portfolio</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Budget</th>
                  <th className="px-6 py-3 text-right">Actual Spend</th>
                  <th className="px-6 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {projectPortfolio.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                      No R&D projects
                    </td>
                  </tr>
                ) : (
                  projectPortfolio.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-slate-900">{p.name}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[p.status] || "bg-slate-100 text-slate-700"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-slate-700">{p.budget != null ? formatCurrency(p.budget) : "--"}</td>
                      <td className="px-6 py-3 text-sm text-right text-slate-700">{formatCurrency(p.actualSpend)}</td>
                      <td className="px-6 py-3 text-sm text-slate-500 max-w-[250px] truncate">{p.description || "--"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Milestones */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Milestones</h2>
          {recentMilestones.length === 0 ? (
            <p className="text-sm text-slate-400">No completed milestones yet</p>
          ) : (
            <ul className="space-y-3">
              {recentMilestones.map((m, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 p-4">
                  <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    m.type === "experiment" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {m.type === "experiment" ? "E" : "G"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{m.title}</p>
                    <p className="text-xs text-slate-500">
                      {m.project} &middot; {new Date(m.date).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                    {m.outcome && (
                      <p className="mt-1 text-xs text-slate-600">{m.outcome}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center">
          <p className="text-xs text-slate-400">
            Powered by R&D Financial OS
          </p>
        </div>
      </footer>
    </div>
  )
}
