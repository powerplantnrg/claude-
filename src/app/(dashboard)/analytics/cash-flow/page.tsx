import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import dynamic from "next/dynamic"
import type { Metadata } from "next"

const StackedBarChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.StackedBarChart })),
  { loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const MultiLineChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.MultiLineChart })),
  { loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const MetricCard = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.MetricCard })),
  { loading: () => <div className="h-28 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const LineTrendChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.LineTrendChart })),
  { loading: () => <div className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)

export const metadata: Metadata = {
  title: "Cash Flow Intelligence",
}

function getNext13Weeks(): { start: Date; end: Date; label: string }[] {
  const weeks: { start: Date; end: Date; label: string }[] = []
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday

  for (let i = 0; i < 13; i++) {
    const weekStart = new Date(startOfWeek)
    weekStart.setDate(startOfWeek.getDate() + i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    const label = `W${i + 1}`
    weeks.push({ start: weekStart, end: weekEnd, label })
  }
  return weeks
}

function getLast12Weeks(): { start: Date; end: Date; label: string }[] {
  const weeks: { start: Date; end: Date; label: string }[] = []
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1)

  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(startOfWeek)
    weekStart.setDate(startOfWeek.getDate() - i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    const label = weekStart.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    weeks.push({ start: weekStart, end: weekEnd, label })
  }
  return weeks
}

export default async function CashFlowIntelligencePage() {
  const session = await auth()
  if (!session) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const pastWeeks = getLast12Weeks()
  const forecastWeeks = getNext13Weeks()

  const [journalLines, invoices, bills] = await Promise.all([
    prisma.journalLine.findMany({
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
      },
      include: {
        account: true,
        journalEntry: { select: { date: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId },
    }),
    prisma.bill.findMany({
      where: { organizationId: orgId },
    }),
  ])

  // --- Current cash position ---
  let currentCash = 0
  for (const line of journalLines) {
    if (line.account.type === "Asset" && ["Cash", "Bank", "Current Asset"].includes(line.account.subType || "")) {
      currentCash += line.debit - line.credit
    }
  }

  // --- Weekly cash in vs cash out (past 12 weeks) ---
  const weeklyFlowData = pastWeeks.map((w) => {
    let cashIn = 0
    let cashOut = 0
    for (const line of journalLines) {
      const lineDate = new Date(line.journalEntry.date)
      if (lineDate >= w.start && lineDate <= w.end) {
        if (line.account.type === "Asset" && ["Cash", "Bank"].includes(line.account.subType || "")) {
          if (line.debit > 0) cashIn += line.debit
          if (line.credit > 0) cashOut += line.credit
        }
      }
    }
    return { label: w.label, cashIn, cashOut }
  })

  // --- 13-week cash flow forecast ---
  // Average weekly inflows and outflows from past data
  const avgWeeklyCashIn = weeklyFlowData.reduce((sum, w) => sum + w.cashIn, 0) / Math.max(weeklyFlowData.length, 1)
  const avgWeeklyCashOut = weeklyFlowData.reduce((sum, w) => sum + w.cashOut, 0) / Math.max(weeklyFlowData.length, 1)

  let runningCash = Math.max(currentCash, 0)
  const forecastData = forecastWeeks.map((w, i) => {
    // Add known receivables from due invoices
    let expectedIn = avgWeeklyCashIn
    let expectedOut = avgWeeklyCashOut

    for (const inv of invoices) {
      if (inv.status !== "Paid" && inv.status !== "Void" && inv.dueDate) {
        const dueDate = new Date(inv.dueDate)
        if (dueDate >= w.start && dueDate <= w.end) {
          expectedIn += inv.amountDue || 0
        }
      }
    }

    for (const bill of bills) {
      if (bill.status !== "Paid" && bill.status !== "Void" && bill.dueDate) {
        const dueDate = new Date(bill.dueDate)
        if (dueDate >= w.start && dueDate <= w.end) {
          expectedOut += bill.amountDue || 0
        }
      }
    }

    runningCash += expectedIn - expectedOut
    return { label: w.label, value: Math.max(runningCash, 0) }
  })

  // --- Receivables aging ---
  const now = new Date()
  const receivablesAging = { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyPlus: 0 }
  for (const inv of invoices) {
    if (inv.status === "Paid" || inv.status === "Void") continue
    const due = inv.amountDue || 0
    if (!inv.dueDate) {
      receivablesAging.current += due
      continue
    }
    const dueDate = new Date(inv.dueDate)
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysOverdue <= 0) receivablesAging.current += due
    else if (daysOverdue <= 30) receivablesAging.thirtyDays += due
    else if (daysOverdue <= 60) receivablesAging.sixtyDays += due
    else receivablesAging.ninetyPlus += due
  }

  const receivablesData = [
    {
      label: "Receivables",
      "0-30 days": receivablesAging.current + receivablesAging.thirtyDays,
      "31-60 days": receivablesAging.sixtyDays,
      "61-90 days": 0,
      "90+ days": receivablesAging.ninetyPlus,
    },
  ]

  // --- Payables aging ---
  const payablesAging = { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyPlus: 0 }
  for (const bill of bills) {
    if (bill.status === "Paid" || bill.status === "Void") continue
    const due = bill.amountDue || 0
    if (!bill.dueDate) {
      payablesAging.current += due
      continue
    }
    const dueDate = new Date(bill.dueDate)
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysOverdue <= 0) payablesAging.current += due
    else if (daysOverdue <= 30) payablesAging.thirtyDays += due
    else if (daysOverdue <= 60) payablesAging.sixtyDays += due
    else payablesAging.ninetyPlus += due
  }

  const payablesData = [
    {
      label: "Payables",
      "0-30 days": payablesAging.current + payablesAging.thirtyDays,
      "31-60 days": payablesAging.sixtyDays,
      "61-90 days": 0,
      "90+ days": payablesAging.ninetyPlus,
    },
  ]

  const agingData = [...receivablesData, ...payablesData]

  // --- Burn rate and runway ---
  const totalWeeklyBurn = weeklyFlowData.reduce((sum, w) => sum + w.cashOut, 0)
  const weeklyBurnRate = totalWeeklyBurn / Math.max(weeklyFlowData.length, 1)
  const monthlyBurnRate = weeklyBurnRate * 4.33
  const netWeeklyBurn = weeklyFlowData.reduce((sum, w) => sum + (w.cashOut - w.cashIn), 0) / Math.max(weeklyFlowData.length, 1)
  const runwayWeeks = netWeeklyBurn > 0 ? Math.max(currentCash, 0) / netWeeklyBurn : Infinity
  const runwayMonths = runwayWeeks / 4.33

  // --- Cash flow scenario comparison ---
  let scenarioRunningBest = Math.max(currentCash, 0)
  let scenarioRunningWorst = Math.max(currentCash, 0)
  let scenarioRunningExpected = Math.max(currentCash, 0)

  const scenarioData = forecastWeeks.map((w) => {
    const expectedNet = avgWeeklyCashIn - avgWeeklyCashOut
    const bestNet = avgWeeklyCashIn * 1.2 - avgWeeklyCashOut * 0.85
    const worstNet = avgWeeklyCashIn * 0.7 - avgWeeklyCashOut * 1.15

    scenarioRunningExpected += expectedNet
    scenarioRunningBest += bestNet
    scenarioRunningWorst += worstNet

    return {
      label: w.label,
      expected: Math.max(scenarioRunningExpected, 0),
      best: Math.max(scenarioRunningBest, 0),
      worst: Math.max(scenarioRunningWorst, 0),
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/analytics" className="hover:text-indigo-600 dark:hover:text-indigo-400">Analytics</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cash Flow Intelligence</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cash position, forecasting, and liquidity analysis
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Current Cash Position"
          value={formatCurrency(Math.max(currentCash, 0))}
          trend={currentCash > 0 ? "up" : "down"}
          trendLabel="Cash and bank accounts"
        />
        <MetricCard
          label="Monthly Burn Rate"
          value={formatCurrency(monthlyBurnRate)}
          trend="neutral"
          trendLabel="Average weekly outflow x 4.33"
        />
        <MetricCard
          label="Cash Runway"
          value={runwayMonths === Infinity ? "Sustainable" : `${runwayMonths.toFixed(1)} months`}
          trend={runwayMonths >= 6 || runwayMonths === Infinity ? "up" : "down"}
          trendLabel={runwayMonths === Infinity ? "Net positive cash flow" : `~${Math.floor(runwayWeeks)} weeks`}
        />
        <MetricCard
          label="Total Outstanding AR"
          value={formatCurrency(
            receivablesAging.current + receivablesAging.thirtyDays + receivablesAging.sixtyDays + receivablesAging.ninetyPlus
          )}
          trend={receivablesAging.ninetyPlus > 0 ? "down" : "up"}
          trendLabel={receivablesAging.ninetyPlus > 0 ? `${formatCurrency(receivablesAging.ninetyPlus)} 90+ overdue` : "No severely overdue"}
        />
      </div>

      {/* 13-Week Cash Flow Forecast */}
      <LineTrendChart
        data={forecastData}
        title="13-Week Cash Flow Forecast"
        subtitle="Projected cash position based on historical trends and known commitments"
        color="#4f46e5"
      />

      {/* Cash In vs Cash Out */}
      <StackedBarChart
        data={weeklyFlowData}
        title="Cash In vs Cash Out"
        subtitle="Weekly cash movements (last 12 weeks)"
        keys={[
          { dataKey: "cashIn", name: "Cash In" },
          { dataKey: "cashOut", name: "Cash Out" },
        ]}
        colors={["#10b981", "#f43f5e"]}
      />

      {/* Aging Analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Receivables Aging */}
        <StackedBarChart
          data={receivablesData}
          title="Receivables Aging"
          subtitle="Outstanding invoices by age bucket"
          keys={[
            { dataKey: "0-30 days", name: "0-30 days" },
            { dataKey: "31-60 days", name: "31-60 days" },
            { dataKey: "61-90 days", name: "61-90 days" },
            { dataKey: "90+ days", name: "90+ days" },
          ]}
          colors={["#10b981", "#f59e0b", "#f97316", "#f43f5e"]}
        />

        {/* Payables Aging */}
        <StackedBarChart
          data={payablesData}
          title="Payables Aging"
          subtitle="Outstanding bills by age bucket"
          keys={[
            { dataKey: "0-30 days", name: "0-30 days" },
            { dataKey: "31-60 days", name: "31-60 days" },
            { dataKey: "61-90 days", name: "61-90 days" },
            { dataKey: "90+ days", name: "90+ days" },
          ]}
          colors={["#3b82f6", "#f59e0b", "#f97316", "#f43f5e"]}
        />
      </div>

      {/* Cash Flow Scenario Comparison */}
      <MultiLineChart
        data={scenarioData}
        title="Cash Flow Scenario Comparison"
        subtitle="Best case, expected, and worst case 13-week projections"
        lines={[
          { dataKey: "best", name: "Best Case", color: "#10b981" },
          { dataKey: "expected", name: "Expected", color: "#4f46e5" },
          { dataKey: "worst", name: "Worst Case", color: "#f43f5e", strokeDasharray: "5 5" },
        ]}
      />

      {/* Detailed Aging Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Aging Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-right">0-30 days</th>
                <th className="px-6 py-3 text-right">31-60 days</th>
                <th className="px-6 py-3 text-right">61-90 days</th>
                <th className="px-6 py-3 text-right">90+ days</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">Receivables</td>
                <td className="px-6 py-3 text-right text-sm text-slate-700 dark:text-slate-300">{formatCurrency(receivablesAging.current + receivablesAging.thirtyDays)}</td>
                <td className="px-6 py-3 text-right text-sm text-slate-700 dark:text-slate-300">{formatCurrency(receivablesAging.sixtyDays)}</td>
                <td className="px-6 py-3 text-right text-sm text-slate-700 dark:text-slate-300">{formatCurrency(0)}</td>
                <td className="px-6 py-3 text-right text-sm font-medium text-rose-600">{formatCurrency(receivablesAging.ninetyPlus)}</td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(receivablesAging.current + receivablesAging.thirtyDays + receivablesAging.sixtyDays + receivablesAging.ninetyPlus)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">Payables</td>
                <td className="px-6 py-3 text-right text-sm text-slate-700 dark:text-slate-300">{formatCurrency(payablesAging.current + payablesAging.thirtyDays)}</td>
                <td className="px-6 py-3 text-right text-sm text-slate-700 dark:text-slate-300">{formatCurrency(payablesAging.sixtyDays)}</td>
                <td className="px-6 py-3 text-right text-sm text-slate-700 dark:text-slate-300">{formatCurrency(0)}</td>
                <td className="px-6 py-3 text-right text-sm font-medium text-rose-600">{formatCurrency(payablesAging.ninetyPlus)}</td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(payablesAging.current + payablesAging.thirtyDays + payablesAging.sixtyDays + payablesAging.ninetyPlus)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
