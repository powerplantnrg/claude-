import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { ShareSettings } from "./share-settings"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Investor Data Room",
}

export default async function DataRoomPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const [
    org,
    revenueResult,
    expenseResult,
    bankBalanceResult,
    activeProjectCount,
    rdProjects,
    rdEligibleExpenseResult,
    experiments,
    grantMilestones,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
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

  if (!org) redirect("/login")

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

  const fyEnd = org.financialYearEnd
  const now = new Date()
  const fyYear = now.getMonth() + 1 > fyEnd ? now.getFullYear() + 1 : now.getFullYear()
  const financialYear = `FY${fyYear - 1}/${fyYear}`

  const projectPortfolio = rdProjects.map((p) => {
    const actualSpend = p.rdExpenses.reduce((s, e) => s + (e.journalLine?.debit ?? 0), 0)
    return {
      id: p.id,
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

  const statusColors: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    Completed: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    "On Hold": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    Pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Investor Data Room
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Preview and share key financial and R&D metrics with investors and board members
          </p>
        </div>
      </div>

      {/* Share Settings */}
      <ShareSettings />

      {/* Company Overview */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Company Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Organization
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {org.name}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              ABN
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {org.abn || "Not set"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Financial Year
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {financialYear}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Financial Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Revenue (YTD)
            </p>
            <p className="mt-2 text-xl font-bold text-indigo-700 dark:text-indigo-400">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Expenses (YTD)
            </p>
            <p className="mt-2 text-xl font-bold text-rose-700 dark:text-rose-400">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Net Profit
            </p>
            <p className={`mt-2 text-xl font-bold ${netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
              {formatCurrency(netProfit)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Cash Position
            </p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(cashPosition)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Burn Rate (Monthly)
            </p>
            <p className="mt-2 text-xl font-bold text-amber-700 dark:text-amber-400">
              {formatCurrency(burnRate)}
            </p>
          </div>
        </div>
      </div>

      {/* R&D Overview */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          R&D Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Total R&D Spend
            </p>
            <p className="mt-2 text-xl font-bold text-violet-700 dark:text-violet-400">
              {formatCurrency(totalRdSpend)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Active Projects
            </p>
            <p className="mt-2 text-xl font-bold text-indigo-700 dark:text-indigo-400">
              {activeProjectCount}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              R&D % of Expenses
            </p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              {rdIntensity.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Est. R&D Tax Offset
            </p>
            <p className="mt-2 text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(estimatedRdOffset)}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Key Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Gross Margin
            </p>
            <p className={`mt-2 text-xl font-bold ${grossMargin >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
              {grossMargin.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              R&D Intensity Ratio
            </p>
            <p className="mt-2 text-xl font-bold text-violet-700 dark:text-violet-400">
              {rdIntensity.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Runway (Months)
            </p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              {burnRate > 0 ? Math.floor(cashPosition / burnRate) : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Project Portfolio */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Project Portfolio
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-3">Project</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Budget</th>
                <th className="px-6 py-3 text-right">Actual Spend</th>
                <th className="px-6 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {projectPortfolio.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                    No R&D projects yet
                  </td>
                </tr>
              ) : (
                projectPortfolio.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {p.name}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[p.status] || "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                      {p.budget != null ? formatCurrency(p.budget) : "--"}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(p.actualSpend)}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-[250px] truncate">
                      {p.description || "--"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Milestones */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Recent Milestones
        </h2>
        {recentMilestones.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No completed milestones yet
          </p>
        ) : (
          <ul className="space-y-3">
            {recentMilestones.map((m, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 dark:border-slate-700 p-4">
                <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${m.type === "experiment" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>
                  {m.type === "experiment" ? "E" : "G"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {m.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {m.project} &middot; {new Date(m.date).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  {m.outcome && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {m.outcome}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
