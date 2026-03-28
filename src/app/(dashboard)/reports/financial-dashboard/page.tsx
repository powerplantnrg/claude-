import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { getCurrentFY, getFYDates } from "@/lib/financial-year"
import Link from "next/link"
import { BarChart, DonutChart, KPICard, TrendLine } from "./charts"

const EXPENSE_COLORS = [
  "#6366f1", "#f43f5e", "#f59e0b", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#64748b",
]

async function getMonthlyPLData(orgId: string, months: { start: Date; end: Date; label: string }[]) {
  const results: { label: string; revenue: number; expenses: number; net: number }[] = []

  for (const month of months) {
    const lines = await prisma.journalLine.findMany({
      where: {
        journalEntry: {
          organizationId: orgId,
          status: "Posted",
          date: { gte: month.start, lte: month.end },
        },
        account: { type: { in: ["Revenue", "Expense"] } },
      },
      include: { account: true },
    })

    let revenue = 0
    let expenses = 0
    for (const line of lines) {
      if (line.account.type === "Revenue") {
        revenue += line.credit - line.debit
      } else {
        expenses += line.debit - line.credit
      }
    }

    results.push({ label: month.label, revenue, expenses, net: revenue - expenses })
  }

  return results
}

async function getExpenseBreakdown(orgId: string, startDate: Date, endDate: Date) {
  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: startDate, lte: endDate },
      },
      account: { type: "Expense" },
    },
    include: { account: true },
  })

  const bySubType = new Map<string, number>()
  for (const line of lines) {
    const subType = line.account.subType || "Other"
    bySubType.set(subType, (bySubType.get(subType) || 0) + (line.debit - line.credit))
  }

  return Array.from(bySubType.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

async function getCashPosition(orgId: string, months: { start: Date; end: Date; label: string }[]) {
  // Cash position = running balance of Asset accounts with subType "Cash" or "Bank"
  const results: { label: string; balance: number }[] = []

  for (const month of months) {
    const lines = await prisma.journalLine.findMany({
      where: {
        journalEntry: {
          organizationId: orgId,
          status: "Posted",
          date: { lte: month.end },
        },
        account: {
          type: "Asset",
          subType: { in: ["Cash", "Bank", "Current Asset"] },
        },
      },
      include: { account: true },
    })

    let balance = 0
    for (const line of lines) {
      balance += line.debit - line.credit
    }
    results.push({ label: month.label, balance })
  }

  return results
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

export default async function FinancialDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const months = getLast12Months()
  const currentFY = getCurrentFY()
  const { startDate: fyStart, endDate: fyEnd } = getFYDates(currentFY)

  // Previous FY for comparison
  const prevStartYear = parseInt(currentFY.split("-")[0], 10) - 1
  const prevFY = `${prevStartYear}-${String(prevStartYear + 1).slice(2)}`
  const { startDate: prevFYStart, endDate: prevFYEnd } = getFYDates(prevFY)

  const [monthlyPL, expenseBreakdown, cashPositions] = await Promise.all([
    getMonthlyPLData(orgId, months),
    getExpenseBreakdown(orgId, fyStart, fyEnd),
    getCashPosition(orgId, months),
  ])

  // Current FY totals (use monthly data that falls within FY)
  const fyMonths = monthlyPL.filter((m) => {
    // Check if this month falls within current FY
    const monthIdx = months.findIndex((mo) => mo.label === m.label)
    if (monthIdx < 0) return false
    return months[monthIdx].start >= fyStart && months[monthIdx].end <= fyEnd
  })

  const currentRevenue = monthlyPL.reduce((s, m) => s + m.revenue, 0)
  const currentExpenses = monthlyPL.reduce((s, m) => s + m.expenses, 0)
  const currentNet = currentRevenue - currentExpenses

  // Previous FY totals for growth calculation
  const prevLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: prevFYStart, lte: prevFYEnd },
      },
      account: { type: { in: ["Revenue", "Expense"] } },
    },
    include: { account: true },
  })

  let prevRevenue = 0
  let prevExpenses = 0
  for (const line of prevLines) {
    if (line.account.type === "Revenue") {
      prevRevenue += line.credit - line.debit
    } else {
      prevExpenses += line.debit - line.credit
    }
  }

  // Current ratio: current assets / current liabilities
  const currentAssetLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: { organizationId: orgId, status: "Posted" },
      account: { type: "Asset", subType: { in: ["Cash", "Bank", "Current Asset", "Accounts Receivable"] } },
    },
  })
  const currentLiabLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: { organizationId: orgId, status: "Posted" },
      account: { type: "Liability", subType: { in: ["Current Liability", "Accounts Payable", "GST", "PAYG"] } },
    },
  })

  const totalCurrentAssets = currentAssetLines.reduce((s, l) => s + l.debit - l.credit, 0)
  const totalCurrentLiabilities = currentLiabLines.reduce((s, l) => s + l.credit - l.debit, 0)
  const currentRatio = totalCurrentLiabilities !== 0 ? totalCurrentAssets / totalCurrentLiabilities : 0

  // KPI calculations
  const revenueGrowth = prevRevenue !== 0 ? ((currentRevenue - prevRevenue) / Math.abs(prevRevenue)) * 100 : 0
  const expenseGrowth = prevExpenses !== 0 ? ((currentExpenses - prevExpenses) / Math.abs(prevExpenses)) * 100 : 0
  const profitMargin = currentRevenue !== 0 ? (currentNet / currentRevenue) * 100 : 0

  // Chart data
  const revenueChartData = monthlyPL.map((m) => ({ label: m.label, value: m.revenue }))
  const maxRevenue = Math.max(...revenueChartData.map((d) => d.value), 1)

  const expenseSegments = expenseBreakdown.slice(0, 8).map((item, i) => ({
    label: item.label,
    value: item.value,
    color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
  }))
  // Group remainder
  if (expenseBreakdown.length > 8) {
    const otherTotal = expenseBreakdown.slice(8).reduce((s, e) => s + e.value, 0)
    expenseSegments.push({ label: "Other", value: otherTotal, color: EXPENSE_COLORS[9] })
  }

  const cashData = cashPositions.map((c) => c.balance)
  const latestCash = cashPositions[cashPositions.length - 1]?.balance || 0
  const prevCash = cashPositions.length >= 2 ? cashPositions[cashPositions.length - 2]?.balance || 0 : 0
  const cashTrend = latestCash >= prevCash ? "up" : "down"

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Financial Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Comprehensive financial overview &mdash; Last 12 months vs FY {prevFY}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Revenue Growth"
          value={`${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}%`}
          trend={revenueGrowth >= 0 ? "up" : "down"}
          trendLabel={`vs FY ${prevFY}`}
          subtitle={formatCurrency(currentRevenue)}
        />
        <KPICard
          title="Expense Growth"
          value={`${expenseGrowth >= 0 ? "+" : ""}${expenseGrowth.toFixed(1)}%`}
          trend={expenseGrowth <= 0 ? "up" : "down"}
          trendLabel={`vs FY ${prevFY}`}
          subtitle={formatCurrency(currentExpenses)}
        />
        <KPICard
          title="Profit Margin"
          value={`${profitMargin.toFixed(1)}%`}
          trend={profitMargin >= 0 ? "up" : "down"}
          trendLabel={formatCurrency(currentNet)}
          subtitle="net / revenue"
        />
        <KPICard
          title="Current Ratio"
          value={currentRatio.toFixed(2)}
          trend={currentRatio >= 1 ? "up" : "down"}
          trendLabel={currentRatio >= 1 ? "Healthy" : "Below 1.0"}
          subtitle={`${formatCurrency(totalCurrentAssets)} / ${formatCurrency(totalCurrentLiabilities)}`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue Trend (Monthly)</h2>
          <BarChart data={revenueChartData} maxValue={maxRevenue} barColor="bg-indigo-500" height={200} />
        </div>

        {/* Expense Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Expense Breakdown (FY {currentFY})</h2>
          <div className="flex justify-center">
            <DonutChart segments={expenseSegments} size={200} />
          </div>
        </div>
      </div>

      {/* Cash Position Trend */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Cash Position Trend</h2>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-900">{formatCurrency(latestCash)}</p>
            <p className={`text-sm ${cashTrend === "up" ? "text-emerald-500" : "text-rose-500"}`}>
              {cashTrend === "up" ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(latestCash - prevCash))} from last month
            </p>
          </div>
        </div>
        <TrendLine data={cashData} height={80} color="#6366f1" />
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>{months[0].label}</span>
          <span>{months[months.length - 1].label}</span>
        </div>
      </div>

      {/* Monthly P&L Summary Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Monthly P&amp;L Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Expenses</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {monthlyPL.map((m) => {
                const margin = m.revenue !== 0 ? (m.net / m.revenue) * 100 : 0
                return (
                  <tr key={m.label} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-700">{m.label}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-emerald-700">
                      {formatCurrency(m.revenue)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-rose-700">
                      {formatCurrency(m.expenses)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono text-sm font-semibold tabular-nums ${m.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatCurrency(m.net)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono text-sm tabular-nums ${margin >= 0 ? "text-slate-600" : "text-rose-600"}`}>
                      {margin.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                <td className="px-4 py-3 text-sm font-bold text-indigo-900">Total (12 months)</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-indigo-900">
                  {formatCurrency(currentRevenue)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-indigo-900">
                  {formatCurrency(currentExpenses)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-indigo-900">
                  {formatCurrency(currentNet)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-indigo-900">
                  {profitMargin.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
