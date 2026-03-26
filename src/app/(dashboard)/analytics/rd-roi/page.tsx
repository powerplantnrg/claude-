import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import dynamic from "next/dynamic"
import type { Metadata } from "next"

const LineTrendChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.LineTrendChart })),
  { ssr: false, loading: () => <div className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const StackedBarChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.StackedBarChart })),
  { ssr: false, loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const TrendComparisonChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.TrendComparisonChart })),
  { ssr: false, loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const MetricCard = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.MetricCard })),
  { ssr: false, loading: () => <div className="h-28 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const GaugeChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.GaugeChart })),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)

export const metadata: Metadata = {
  title: "R&D ROI Analytics",
}

function getLast12Months(): { start: Date; end: Date; label: string }[] {
  const months: { start: Date; end: Date; label: string }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    const label = d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
    months.push({
      start: new Date(year, month, 1),
      end: new Date(year, month, lastDay, 23, 59, 59, 999),
      label,
    })
  }
  return months
}

export default async function RdRoiPage() {
  const session = await auth()
  if (!session) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const months = getLast12Months()

  const [journalLines, rdProjects, experiments] = await Promise.all([
    prisma.journalLine.findMany({
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
      },
      include: {
        account: true,
        journalEntry: { select: { date: true } },
      },
    }),
    prisma.rdProject.findMany({
      where: { organizationId: orgId },
      include: {
        rdExpenses: { include: { journalLine: true } },
        activities: { include: { timeEntries: true, experiments: true } },
      },
    }),
    prisma.experiment.findMany({
      where: {
        rdActivity: { rdProject: { organizationId: orgId } },
      },
    }),
  ])

  // --- R&D spend as % of revenue by month ---
  const rdPctRevenueData = months.map((m) => {
    let revenue = 0
    let rdSpend = 0
    for (const line of journalLines) {
      const lineDate = new Date(line.journalEntry.date)
      if (lineDate >= m.start && lineDate <= m.end) {
        if (line.account.type === "Revenue") revenue += line.credit - line.debit
        if (line.account.type === "Expense" && line.account.isRdEligible) rdSpend += line.debit - line.credit
      }
    }
    const pct = revenue > 0 ? (rdSpend / revenue) * 100 : 0
    return { label: m.label, value: parseFloat(pct.toFixed(1)) }
  })

  // --- Cost per experiment by project (grouped bar) ---
  const projectCostData = rdProjects.map((proj) => {
    const expenseTotal = proj.rdExpenses.reduce((sum, exp) => sum + (exp.journalLine?.debit || 0), 0)
    const timeTotal = proj.activities.reduce(
      (actSum, act) =>
        actSum + act.timeEntries.reduce((teSum, te) => teSum + te.hours * (te.hourlyRate || 0), 0),
      0
    )
    const totalCost = expenseTotal + timeTotal
    const experimentCount = proj.activities.reduce((sum, act) => sum + act.experiments.length, 0)
    return {
      label: proj.name.length > 20 ? proj.name.substring(0, 20) + "..." : proj.name,
      totalCost,
      costPerExperiment: experimentCount > 0 ? totalCost / experimentCount : 0,
      experimentCount,
    }
  }).filter((d) => d.totalCost > 0)

  // --- Experiment success rate trend ---
  const successRateData = months.map((m) => {
    const monthExperiments = experiments.filter((e) => {
      const created = new Date(e.createdAt)
      return created >= m.start && created <= m.end
    })
    const completed = monthExperiments.filter((e) => e.status === "Completed")
    const succeeded = monthExperiments.filter((e) => e.status === "Completed" && e.outcome === "Success")
    const rate = completed.length > 0 ? (succeeded.length / completed.length) * 100 : 0
    return { label: m.label, value: parseFloat(rate.toFixed(1)) }
  })

  // --- R&D tax offset impact ---
  const totalRdSpend = journalLines
    .filter((l) => l.account.type === "Expense" && l.account.isRdEligible)
    .reduce((sum, l) => sum + l.debit - l.credit, 0)
  const totalRevenue = journalLines
    .filter((l) => l.account.type === "Revenue")
    .reduce((sum, l) => sum + l.credit - l.debit, 0)
  const totalExpenses = journalLines
    .filter((l) => l.account.type === "Expense")
    .reduce((sum, l) => sum + l.debit - l.credit, 0)
  const estimatedTaxOffset = totalRdSpend * 0.435
  const taxableIncome = totalRevenue - totalExpenses
  const nominalTaxRate = 25 // Australian company tax rate for base rate entities
  const effectiveTaxRate = taxableIncome > 0
    ? ((taxableIncome * (nominalTaxRate / 100) - estimatedTaxOffset) / taxableIncome) * 100
    : 0

  // --- Innovation pipeline funnel (stacked bars) ---
  const planned = experiments.filter((e) => e.status === "Planned").length
  const inProgress = experiments.filter((e) => e.status === "InProgress").length
  const completed = experiments.filter((e) => e.status === "Completed").length
  const succeeded = experiments.filter((e) => e.status === "Completed" && e.outcome === "Success").length

  const funnelData = [
    { label: "Pipeline", planned: planned, inProgress: 0, completed: 0, succeeded: 0 },
    { label: "In Progress", planned: 0, inProgress: inProgress, completed: 0, succeeded: 0 },
    { label: "Completed", planned: 0, inProgress: 0, completed: completed, succeeded: 0 },
    { label: "Succeeded", planned: 0, inProgress: 0, completed: 0, succeeded: succeeded },
  ]

  // --- R&D headcount cost vs output ---
  const rdHeadcountData = rdProjects.map((proj) => {
    const timeHours = proj.activities.reduce(
      (sum, act) => sum + act.timeEntries.reduce((teSum, te) => teSum + te.hours, 0),
      0
    )
    const timeCost = proj.activities.reduce(
      (sum, act) => sum + act.timeEntries.reduce((teSum, te) => teSum + te.hours * (te.hourlyRate || 0), 0),
      0
    )
    const experimentCount = proj.activities.reduce((sum, act) => sum + act.experiments.length, 0)
    return {
      label: proj.name.length > 20 ? proj.name.substring(0, 20) + "..." : proj.name,
      metric1: timeCost,
      metric2: experimentCount,
    }
  }).filter((d) => d.metric1 > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/analytics" className="hover:text-indigo-600 dark:hover:text-indigo-400">Analytics</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">R&D ROI Analytics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Research and development return on investment analysis
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total R&D Spend"
          value={formatCurrency(totalRdSpend)}
          trend="neutral"
          trendLabel="R&D eligible expenses"
        />
        <MetricCard
          label="Estimated Tax Offset"
          value={formatCurrency(estimatedTaxOffset)}
          trend="up"
          trendLabel="43.5% of eligible spend"
        />
        <MetricCard
          label="Effective Tax Rate"
          value={`${Math.max(effectiveTaxRate, 0).toFixed(1)}%`}
          trend={effectiveTaxRate < nominalTaxRate ? "up" : "neutral"}
          trendLabel={`Nominal: ${nominalTaxRate}%`}
        />
        <MetricCard
          label="Active Projects"
          value={String(rdProjects.filter((p) => p.status === "Active").length)}
          subtitle={`${experiments.length} total experiments`}
        />
      </div>

      {/* Gauge charts row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GaugeChart
          value={totalRevenue > 0 ? (totalRdSpend / totalRevenue) * 100 : 0}
          max={30}
          label="R&D as % of Revenue"
          color="#8b5cf6"
        />
        <GaugeChart
          value={experiments.length > 0 ? (succeeded / experiments.length) * 100 : 0}
          max={100}
          label="Experiment Success Rate"
          color="#10b981"
        />
        <GaugeChart
          value={totalRdSpend > 0 ? (estimatedTaxOffset / totalRdSpend) * 100 : 0}
          max={100}
          label="R&D ROI (Tax Offset / Spend)"
          color="#4f46e5"
        />
      </div>

      {/* R&D Spend as % of Revenue */}
      <LineTrendChart
        data={rdPctRevenueData}
        title="R&D Spend as % of Revenue"
        subtitle="Monthly R&D eligible expenses relative to revenue"
        color="#8b5cf6"
        yAxisFormatter={(v: number) => `${v}%`}
        tooltipFormatter={(v: number) => `${v}%`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cost per experiment by project */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Cost per Experiment by Project</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Total cost and per-experiment breakdown</p>
          </div>
          <div className="p-6">
            {projectCostData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                No R&D project cost data available
              </div>
            ) : (
              <div className="space-y-3">
                {projectCostData.map((proj) => (
                  <div key={proj.label} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{proj.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{proj.experimentCount} experiments</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(proj.totalCost)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatCurrency(proj.costPerExperiment)} / experiment
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Experiment success rate trend */}
        <LineTrendChart
          data={successRateData}
          title="Experiment Success Rate Trend"
          subtitle="Percentage of completed experiments that succeeded"
          color="#10b981"
          yAxisFormatter={(v: number) => `${v}%`}
          tooltipFormatter={(v: number) => `${v}%`}
        />
      </div>

      {/* Innovation Pipeline Funnel */}
      <StackedBarChart
        data={funnelData}
        title="Innovation Pipeline"
        subtitle="Experiment progression through pipeline stages"
        keys={[
          { dataKey: "planned", name: "Planned" },
          { dataKey: "inProgress", name: "In Progress" },
          { dataKey: "completed", name: "Completed" },
          { dataKey: "succeeded", name: "Succeeded" },
        ]}
        colors={["#64748b", "#f59e0b", "#3b82f6", "#10b981"]}
        yAxisFormatter={(v: number) => `${v}`}
      />

      {/* R&D Headcount Cost vs Output */}
      {rdHeadcountData.length > 0 && (
        <TrendComparisonChart
          data={rdHeadcountData}
          title="R&D Headcount Cost vs Output"
          subtitle="Labour cost compared to experiment output by project"
          metric1Name="Labour Cost ($)"
          metric2Name="Experiments (#)"
          metric1Color="#f43f5e"
          metric2Color="#4f46e5"
        />
      )}
    </div>
  )
}
