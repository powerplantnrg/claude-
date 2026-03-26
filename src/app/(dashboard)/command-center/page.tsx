import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { RevenueVsComputeChart, RdClaimTrendChart } from "./command-charts"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Command Center",
}

export default async function CommandCenterPage() {
  const session = await auth()
  if (!session) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

  // Fetch data in parallel
  const [
    journalLines,
    bankBalance,
    cloudCosts,
    tokenUsage,
    computeUsage,
    activeExperiments,
    rdProjects,
    rdEligibleExpenses,
    claimDrafts,
    carbonEntries,
  ] = await Promise.all([
    // All posted journal lines
    prisma.journalLine.findMany({
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
      },
      include: {
        account: true,
        journalEntry: { select: { date: true } },
      },
    }),
    // Bank balance (sum of all bank transactions)
    prisma.bankTransaction.aggregate({
      _sum: { amount: true },
      where: { organizationId: orgId },
    }),
    // Cloud costs
    prisma.cloudCostEntry.findMany({
      where: {
        provider: { organizationId: orgId },
      },
      include: { provider: true },
    }),
    // Token usage
    prisma.tokenUsage.findMany({
      where: {
        provider: { organizationId: orgId },
      },
    }),
    // Compute usage
    prisma.computeUsage.findMany({
      where: {
        provider: { organizationId: orgId },
      },
    }),
    // Active experiments
    prisma.experiment.count({
      where: {
        rdActivity: { rdProject: { organizationId: orgId } },
        status: { in: ["Running", "InProgress", "Planned"] },
      },
    }),
    // Active R&D projects
    prisma.rdProject.findMany({
      where: { organizationId: orgId, status: "Active" },
      include: {
        rdExpenses: { include: { journalLine: true } },
        activities: { include: { timeEntries: true } },
      },
    }),
    // R&D eligible expenses
    prisma.journalLine.aggregate({
      _sum: { debit: true },
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Expense", isRdEligible: true },
      },
    }),
    // R&D claim drafts
    prisma.rdClaimDraft.findMany({
      orderBy: { financialYear: "asc" },
    }),
    // Carbon entries
    prisma.carbonEntry.findMany({
      where: { organizationId: orgId },
    }),
  ])

  // ==========================
  // Section 1: Financial Health
  // ==========================

  // Current month revenue
  const currentMonthRevenue = journalLines
    .filter(
      (l) =>
        l.account.type === "Revenue" &&
        new Date(l.journalEntry.date) >= currentMonthStart
    )
    .reduce((sum, l) => sum + l.credit, 0)

  // Total revenue + expenses
  const totalRevenue = journalLines
    .filter((l) => l.account.type === "Revenue")
    .reduce((sum, l) => sum + l.credit, 0)

  const totalExpenses = journalLines
    .filter((l) => l.account.type === "Expense")
    .reduce((sum, l) => sum + l.debit, 0)

  // Monthly expenses for last 3 months (for burn rate)
  const monthlyExpenses: number[] = []
  for (let i = 0; i < 3; i++) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 0, 23, 59, 59)
    const monthExp = journalLines
      .filter(
        (l) =>
          l.account.type === "Expense" &&
          new Date(l.journalEntry.date) >= mStart &&
          new Date(l.journalEntry.date) <= mEnd
      )
      .reduce((sum, l) => sum + l.debit, 0)
    monthlyExpenses.push(monthExp)
  }

  const monthlyBurnRate =
    monthlyExpenses.length > 0
      ? monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length
      : 0

  const cashBalance = bankBalance._sum.amount ?? 0
  const cashRunway = monthlyBurnRate > 0 ? cashBalance / monthlyBurnRate : Infinity

  const netMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0

  // ==========================
  // Section 2: AI & Compute
  // ==========================

  const totalCloudSpend = cloudCosts.reduce((sum, c) => sum + c.amount, 0)
  const monthlyCloudSpend = cloudCosts
    .filter((c) => new Date(c.date) >= currentMonthStart)
    .reduce((sum, c) => sum + c.amount, 0)

  const totalTokenSpend = tokenUsage.reduce((sum, t) => sum + t.cost, 0)
  const totalComputeSpend = computeUsage.reduce((sum, c) => sum + c.cost, 0)

  const experimentCount = activeExperiments || 1
  const costPerExperiment = totalCloudSpend / experimentCount

  // ==========================
  // Section 3: R&D Intelligence
  // ==========================

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

  const rdIntensity = totalRevenue > 0 ? (totalRdSpend / totalRevenue) * 100 : 0
  const rdEligible = rdEligibleExpenses._sum.debit ?? 0
  const estimatedAnnualOffset = rdEligible * 0.435

  const totalCarbonEmissions = carbonEntries.reduce((sum, c) => sum + c.totalEmissions, 0)
  const carbonPerRdDollar = totalRdSpend > 0 ? totalCarbonEmissions / totalRdSpend : 0

  // ==========================
  // Section 4: Trends
  // ==========================

  const monthLabels: { label: string; start: Date; end: Date }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const label = d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
    monthLabels.push({ label, start: d, end })
  }

  const revenueVsComputeData = monthLabels.map((m) => {
    const revenue = journalLines
      .filter(
        (l) =>
          l.account.type === "Revenue" &&
          new Date(l.journalEntry.date) >= m.start &&
          new Date(l.journalEntry.date) <= m.end
      )
      .reduce((sum, l) => sum + l.credit, 0)

    const computeCost = cloudCosts
      .filter((c) => new Date(c.date) >= m.start && new Date(c.date) <= m.end)
      .reduce((sum, c) => sum + c.amount, 0)

    return { month: m.label, revenue, computeCost }
  })

  // R&D Claim trend by FY
  const claimsByFy = new Map<string, number>()
  for (const draft of claimDrafts) {
    const fy = draft.financialYear
    claimsByFy.set(fy, (claimsByFy.get(fy) || 0) + draft.estimatedOffset)
  }
  const rdClaimTrendData = Array.from(claimsByFy.entries())
    .map(([fy, estimatedOffset]) => ({ fy, estimatedOffset }))
    .sort((a, b) => a.fy.localeCompare(b.fy))

  // If no claim data, add current FY estimate
  if (rdClaimTrendData.length === 0) {
    const fyYear = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
    rdClaimTrendData.push({
      fy: `FY${fyYear}`,
      estimatedOffset: estimatedAnnualOffset,
    })
  }

  // ==========================
  // Section 5: Alerts & Recommendations
  // ==========================

  // We'll compute alerts/recommendations server-side instead of calling the API
  const alerts: { title: string; message: string; severity: "info" | "warning" | "critical" }[] = []

  // Cloud cost change
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const prevMonthCloud = cloudCosts
    .filter((c) => new Date(c.date) >= prevMonthStart && new Date(c.date) <= prevMonthEnd)
    .reduce((sum, c) => sum + c.amount, 0)

  if (prevMonthCloud > 0 && monthlyCloudSpend > prevMonthCloud * 1.25) {
    const pctIncrease = ((monthlyCloudSpend - prevMonthCloud) / prevMonthCloud * 100).toFixed(0)
    alerts.push({
      title: "Cloud cost spike",
      message: `Cloud costs increased ${pctIncrease}% this month compared to last month.`,
      severity: "warning",
    })
  }

  // Cash runway warning
  if (cashRunway < 6 && cashRunway !== Infinity) {
    alerts.push({
      title: "Low cash runway",
      message: `Current cash runway is ${cashRunway.toFixed(1)} months. Consider reviewing expenses.`,
      severity: cashRunway < 3 ? "critical" : "warning",
    })
  }

  // R&D budget alerts
  for (const proj of rdProjects) {
    if (!proj.budget || proj.budget <= 0) continue
    const projSpend = proj.rdExpenses.reduce(
      (sum, exp) => sum + (exp.journalLine.debit || 0),
      0
    )
    if (projSpend > proj.budget * 0.8) {
      alerts.push({
        title: `Budget alert: ${proj.name}`,
        message: `${Math.round((projSpend / proj.budget) * 100)}% of budget consumed.`,
        severity: projSpend > proj.budget ? "critical" : "warning",
      })
    }
  }

  // Negative margin
  if (netMargin < 0) {
    alerts.push({
      title: "Negative net margin",
      message: `Current net margin is ${netMargin.toFixed(1)}%. Revenue is not covering expenses.`,
      severity: "critical",
    })
  }

  // Recommendations
  const recommendations: string[] = []
  if (rdIntensity > 50) {
    recommendations.push(
      `R&D intensity is ${rdIntensity.toFixed(0)}% of revenue - consider diversifying revenue streams.`
    )
  }
  if (carbonPerRdDollar > 0.5) {
    recommendations.push(
      `Carbon intensity per R&D dollar is high (${carbonPerRdDollar.toFixed(2)} kg/$). Consider renewable compute options.`
    )
  }
  if (costPerExperiment > 5000) {
    recommendations.push(
      `Average cost per experiment is ${formatCurrency(costPerExperiment)}. Review resource allocation.`
    )
  }
  if (rdEligible > 0 && estimatedAnnualOffset > 0) {
    recommendations.push(
      `Estimated R&D tax offset of ${formatCurrency(estimatedAnnualOffset)} available. Ensure compliance documentation is complete.`
    )
  }
  if (recommendations.length === 0) {
    recommendations.push("All metrics are within healthy ranges. Keep monitoring.")
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Command Center
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Unified CFO + CTO dashboard - Financial health, AI costs, and R&D intelligence
        </p>
      </div>

      {/* Section 1: Financial Health */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Financial Health
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Monthly Burn Rate"
            value={formatCurrency(monthlyBurnRate)}
            sub="Avg last 3 months"
            color="text-rose-700 dark:text-rose-400"
            bg="bg-rose-50 dark:bg-rose-900/20"
            border="border-rose-200 dark:border-rose-800"
          />
          <KpiCard
            label="Cash Runway"
            value={cashRunway === Infinity ? "N/A" : `${cashRunway.toFixed(1)} mo`}
            sub="Months of runway"
            color={
              cashRunway < 6 && cashRunway !== Infinity
                ? "text-rose-700 dark:text-rose-400"
                : "text-emerald-700 dark:text-emerald-400"
            }
            bg={
              cashRunway < 6 && cashRunway !== Infinity
                ? "bg-rose-50 dark:bg-rose-900/20"
                : "bg-emerald-50 dark:bg-emerald-900/20"
            }
            border={
              cashRunway < 6 && cashRunway !== Infinity
                ? "border-rose-200 dark:border-rose-800"
                : "border-emerald-200 dark:border-emerald-800"
            }
          />
          <KpiCard
            label="Revenue (This Month)"
            value={formatCurrency(currentMonthRevenue)}
            sub="Current month"
            color="text-indigo-700 dark:text-indigo-400"
            bg="bg-indigo-50 dark:bg-indigo-900/20"
            border="border-indigo-200 dark:border-indigo-800"
          />
          <KpiCard
            label="Net Margin"
            value={`${netMargin.toFixed(1)}%`}
            sub={netMargin >= 0 ? "Healthy" : "Below breakeven"}
            color={
              netMargin >= 0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400"
            }
            bg={
              netMargin >= 0
                ? "bg-emerald-50 dark:bg-emerald-900/20"
                : "bg-rose-50 dark:bg-rose-900/20"
            }
            border={
              netMargin >= 0
                ? "border-emerald-200 dark:border-emerald-800"
                : "border-rose-200 dark:border-rose-800"
            }
          />
        </div>
      </div>

      {/* Section 2: AI & Compute */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          AI & Compute
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Monthly Cloud Spend"
            value={formatCurrency(monthlyCloudSpend)}
            sub="This month"
            color="text-cyan-700 dark:text-cyan-400"
            bg="bg-cyan-50 dark:bg-cyan-900/20"
            border="border-cyan-200 dark:border-cyan-800"
          />
          <KpiCard
            label="Cost per Experiment"
            value={formatCurrency(costPerExperiment)}
            sub={`${experimentCount} active experiments`}
            color="text-amber-700 dark:text-amber-400"
            bg="bg-amber-50 dark:bg-amber-900/20"
            border="border-amber-200 dark:border-amber-800"
          />
          <KpiCard
            label="Token Spend"
            value={formatCurrency(totalTokenSpend)}
            sub="Total LLM token costs"
            color="text-violet-700 dark:text-violet-400"
            bg="bg-violet-50 dark:bg-violet-900/20"
            border="border-violet-200 dark:border-violet-800"
          />
          <KpiCard
            label="GPU Utilization Cost"
            value={formatCurrency(totalComputeSpend)}
            sub="Total compute usage"
            color="text-blue-700 dark:text-blue-400"
            bg="bg-blue-50 dark:bg-blue-900/20"
            border="border-blue-200 dark:border-blue-800"
          />
        </div>
      </div>

      {/* Section 3: R&D Intelligence */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          R&D Intelligence
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="R&D Intensity"
            value={`${rdIntensity.toFixed(1)}%`}
            sub="R&D spend / revenue"
            color="text-indigo-700 dark:text-indigo-400"
            bg="bg-indigo-50 dark:bg-indigo-900/20"
            border="border-indigo-200 dark:border-indigo-800"
          />
          <KpiCard
            label="Active Experiments"
            value={activeExperiments.toString()}
            sub="Currently running"
            color="text-emerald-700 dark:text-emerald-400"
            bg="bg-emerald-50 dark:bg-emerald-900/20"
            border="border-emerald-200 dark:border-emerald-800"
          />
          <KpiCard
            label="Est. Annual R&D Offset"
            value={formatCurrency(estimatedAnnualOffset)}
            sub="43.5% offset rate"
            color="text-violet-700 dark:text-violet-400"
            bg="bg-violet-50 dark:bg-violet-900/20"
            border="border-violet-200 dark:border-violet-800"
          />
          <KpiCard
            label="Carbon per R&D Dollar"
            value={`${carbonPerRdDollar.toFixed(3)} kg`}
            sub="kg CO2e per $1 R&D"
            color="text-emerald-700 dark:text-emerald-400"
            bg="bg-emerald-50 dark:bg-emerald-900/20"
            border="border-emerald-200 dark:border-emerald-800"
          />
        </div>
      </div>

      {/* Section 4: Trends */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Trends
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RevenueVsComputeChart data={revenueVsComputeData} />
          <RdClaimTrendChart data={rdClaimTrendData} />
        </div>
      </div>

      {/* Section 5: Alerts & Recommendations */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Alerts & Recommendations
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Alerts */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Active Alerts
              </h3>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              {alerts.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  No active alerts. All systems healthy.
                </div>
              ) : (
                alerts.slice(0, 5).map((alert, i) => (
                  <div key={i} className="px-6 py-3 flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-block h-2 w-2 rounded-full shrink-0 ${
                        alert.severity === "critical"
                          ? "bg-rose-500"
                          : alert.severity === "warning"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {alert.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Recommendations
              </h3>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              {recommendations.map((rec, i) => (
                <div key={i} className="px-6 py-3 flex items-start gap-3">
                  <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">{rec}</p>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                View detailed dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  color,
  bg,
  border,
}: {
  label: string
  value: string
  sub: string
  color: string
  bg: string
  border: string
}) {
  return (
    <div
      className={`rounded-xl border ${border} ${bg} p-5 shadow-sm transition-shadow hover:shadow-md`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}
