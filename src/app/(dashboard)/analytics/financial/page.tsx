import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import dynamic from "next/dynamic"
import type { Metadata } from "next"

const WaterfallChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.WaterfallChart })),
  { loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const BreakdownPieChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.BreakdownPieChart })),
  { loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const LineTrendChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.LineTrendChart })),
  { loading: () => <div className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const StackedBarChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.StackedBarChart })),
  { loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const TrendComparisonChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.TrendComparisonChart })),
  { loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const MetricCard = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.MetricCard })),
  { loading: () => <div className="h-28 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)

export const metadata: Metadata = {
  title: "Financial Analytics",
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

export default async function FinancialAnalyticsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const months = getLast12Months()

  // Fetch all journal lines for the org
  const journalLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: { organizationId: orgId, status: "Posted" },
    },
    include: {
      account: true,
      journalEntry: { select: { date: true } },
    },
  })

  // --- Revenue Waterfall (monthly growth/decline) ---
  const monthlyRevenue: { label: string; revenue: number }[] = months.map((m) => {
    let revenue = 0
    for (const line of journalLines) {
      const lineDate = new Date(line.journalEntry.date)
      if (lineDate >= m.start && lineDate <= m.end && line.account.type === "Revenue") {
        revenue += line.credit - line.debit
      }
    }
    return { label: m.label, revenue }
  })

  const waterfallData: { name: string; value: number; isTotal?: boolean }[] = []
  waterfallData.push({ name: monthlyRevenue[0]?.label || "Start", value: monthlyRevenue[0]?.revenue || 0, isTotal: true })
  for (let i = 1; i < monthlyRevenue.length; i++) {
    const diff = monthlyRevenue[i].revenue - monthlyRevenue[i - 1].revenue
    waterfallData.push({ name: monthlyRevenue[i].label, value: diff })
  }
  const totalRevenueLast = monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0
  waterfallData.push({ name: "Current", value: totalRevenueLast, isTotal: true })

  // --- Expense breakdown by category ---
  const expenseByCategory: Record<string, number> = {}
  for (const line of journalLines) {
    if (line.account.type === "Expense") {
      const cat = line.account.subType || line.account.name
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (line.debit - line.credit)
    }
  }
  const expensePieData = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  // --- Gross margin trend (12 months) ---
  const grossMarginData = months.map((m) => {
    let revenue = 0
    let cogs = 0
    for (const line of journalLines) {
      const lineDate = new Date(line.journalEntry.date)
      if (lineDate >= m.start && lineDate <= m.end) {
        if (line.account.type === "Revenue") revenue += line.credit - line.debit
        if (line.account.type === "Expense" && (line.account.subType === "Cost of Goods Sold" || line.account.subType === "COGS")) {
          cogs += line.debit - line.credit
        }
      }
    }
    const margin = revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0
    return { label: m.label, value: parseFloat(margin.toFixed(1)) }
  })

  // --- Working capital analysis ---
  const workingCapitalData = months.map((m) => {
    let currentAssets = 0
    let currentLiabilities = 0
    for (const line of journalLines) {
      const lineDate = new Date(line.journalEntry.date)
      if (lineDate <= m.end) {
        if (line.account.type === "Asset" && ["Cash", "Bank", "Current Asset", "Accounts Receivable"].includes(line.account.subType || "")) {
          currentAssets += line.debit - line.credit
        }
        if (line.account.type === "Liability" && ["Current Liability", "Accounts Payable", "GST", "PAYG"].includes(line.account.subType || "")) {
          currentLiabilities += line.credit - line.debit
        }
      }
    }
    return {
      label: m.label,
      currentAssets: Math.max(currentAssets, 0),
      currentLiabilities: Math.max(currentLiabilities, 0),
    }
  })

  // --- DSO and DPO trends ---
  const invoices = await prisma.invoice.findMany({
    where: { organizationId: orgId },
  })

  const dsoDpoData = months.map((m) => {
    let revenue = 0
    let receivables = 0
    let expenses = 0
    let payables = 0
    for (const line of journalLines) {
      const lineDate = new Date(line.journalEntry.date)
      if (lineDate >= m.start && lineDate <= m.end) {
        if (line.account.type === "Revenue") revenue += line.credit - line.debit
        if (line.account.type === "Expense") expenses += line.debit - line.credit
      }
      if (lineDate <= m.end) {
        if (line.account.subType === "Accounts Receivable") receivables += line.debit - line.credit
        if (line.account.subType === "Accounts Payable") payables += line.credit - line.debit
      }
    }
    const dailyRevenue = revenue / 30
    const dailyExpenses = expenses / 30
    const dso = dailyRevenue > 0 ? Math.max(receivables, 0) / dailyRevenue : 0
    const dpo = dailyExpenses > 0 ? Math.max(payables, 0) / dailyExpenses : 0
    return { label: m.label, metric1: parseFloat(dso.toFixed(1)), metric2: parseFloat(dpo.toFixed(1)) }
  })

  // --- Cash conversion cycle ---
  const latestDso = dsoDpoData[dsoDpoData.length - 1]?.metric1 || 0
  const latestDpo = dsoDpoData[dsoDpoData.length - 1]?.metric2 || 0
  // Simplified: CCC = DSO - DPO (inventory days excluded for services)
  const cashConversionCycle = latestDso - latestDpo

  // Total revenue and expenses for summary
  const totalRevenue = journalLines
    .filter((l) => l.account.type === "Revenue")
    .reduce((sum, l) => sum + l.credit - l.debit, 0)
  const totalExpenses = journalLines
    .filter((l) => l.account.type === "Expense")
    .reduce((sum, l) => sum + l.debit - l.credit, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/analytics" className="hover:text-indigo-600 dark:hover:text-indigo-400">Analytics</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Financial Analytics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Comprehensive financial performance metrics and trends
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Revenue (12mo)"
          value={formatCurrency(totalRevenue)}
          trend={totalRevenue > 0 ? "up" : "neutral"}
          trendLabel="Trailing 12 months"
        />
        <MetricCard
          label="Total Expenses (12mo)"
          value={formatCurrency(totalExpenses)}
          trend="neutral"
          trendLabel="Trailing 12 months"
        />
        <MetricCard
          label="Gross Margin"
          value={`${grossMarginData[grossMarginData.length - 1]?.value || 0}%`}
          trend={grossMarginData[grossMarginData.length - 1]?.value >= 50 ? "up" : "down"}
          trendLabel="Current month"
        />
        <MetricCard
          label="Cash Conversion Cycle"
          value={`${cashConversionCycle.toFixed(1)} days`}
          trend={cashConversionCycle <= 30 ? "up" : "down"}
          trendLabel={`DSO: ${latestDso.toFixed(0)}d | DPO: ${latestDpo.toFixed(0)}d`}
        />
      </div>

      {/* Revenue Waterfall */}
      <WaterfallChart
        data={waterfallData}
        title="Revenue Waterfall"
        subtitle="Month-over-month revenue growth and decline"
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Expense Breakdown */}
        <BreakdownPieChart
          data={expensePieData}
          title="Expense Breakdown by Category"
          subtitle="Click segments to highlight"
        />

        {/* Gross Margin Trend */}
        <LineTrendChart
          data={grossMarginData}
          title="Gross Margin Trend"
          subtitle="12-month gross margin percentage"
          color="#10b981"
          yAxisFormatter={(v: number) => `${v}%`}
          tooltipFormatter={(v: number) => `${v}%`}
        />
      </div>

      {/* Working Capital Analysis */}
      <StackedBarChart
        data={workingCapitalData}
        title="Working Capital Analysis"
        subtitle="Current Assets vs Current Liabilities over time"
        keys={[
          { dataKey: "currentAssets", name: "Current Assets" },
          { dataKey: "currentLiabilities", name: "Current Liabilities" },
        ]}
        colors={["#4f46e5", "#f43f5e"]}
      />

      {/* DSO and DPO Trend */}
      <TrendComparisonChart
        data={dsoDpoData}
        title="DSO vs DPO Trend"
        subtitle="Days Sales Outstanding and Days Payable Outstanding"
        metric1Name="DSO (days)"
        metric2Name="DPO (days)"
        metric1Color="#4f46e5"
        metric2Color="#f59e0b"
        metric1Unit="d"
        metric2Unit="d"
      />
    </div>
  )
}
