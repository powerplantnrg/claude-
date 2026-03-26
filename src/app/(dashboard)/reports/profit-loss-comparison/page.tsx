import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { getCurrentFY, getFYDates, getFYOptions, formatFYPeriod } from "@/lib/financial-year"
import Link from "next/link"

type AccountTotal = {
  accountId: string
  code: string
  name: string
  subType: string
  total: number
}

async function getPLData(orgId: string, startDate: Date, endDate: Date) {
  const journalLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: startDate, lte: endDate },
      },
      account: {
        type: { in: ["Revenue", "Expense"] },
      },
    },
    include: { account: true },
  })

  const revenueAccounts = new Map<string, AccountTotal>()
  const expenseAccounts = new Map<string, AccountTotal>()

  for (const line of journalLines) {
    const map = line.account.type === "Revenue" ? revenueAccounts : expenseAccounts
    const amount = line.account.type === "Revenue"
      ? line.credit - line.debit
      : line.debit - line.credit
    const existing = map.get(line.accountId)
    if (existing) {
      existing.total += amount
    } else {
      map.set(line.accountId, {
        accountId: line.accountId,
        code: line.account.code,
        name: line.account.name,
        subType: line.account.subType || "Other",
        total: amount,
      })
    }
  }

  const revenue = Array.from(revenueAccounts.values()).sort((a, b) => a.code.localeCompare(b.code))
  const expenses = Array.from(expenseAccounts.values()).sort((a, b) => a.code.localeCompare(b.code))
  const totalRevenue = revenue.reduce((s, a) => s + a.total, 0)
  const totalExpenses = expenses.reduce((s, a) => s + a.total, 0)
  const netProfit = totalRevenue - totalExpenses

  return { revenue, expenses, totalRevenue, totalExpenses, netProfit }
}

function calcChange(current: number, comparison: number) {
  const dollarChange = current - comparison
  const pctChange = comparison !== 0 ? ((current - comparison) / Math.abs(comparison)) * 100 : current !== 0 ? 100 : 0
  return { dollarChange, pctChange }
}

function ChangeCell({ dollarChange, pctChange }: { dollarChange: number; pctChange: number }) {
  const isPositive = dollarChange > 0
  const isNegative = dollarChange < 0
  const colorClass = isPositive ? "text-emerald-600" : isNegative ? "text-rose-600" : "text-slate-400"
  const arrow = isPositive ? "\u2191" : isNegative ? "\u2193" : ""

  return (
    <>
      <td className={`px-4 py-2.5 text-right font-mono text-sm tabular-nums ${colorClass}`}>
        {arrow} {formatCurrency(Math.abs(dollarChange))}
      </td>
      <td className={`px-4 py-2.5 text-right font-mono text-sm tabular-nums ${colorClass}`}>
        {dollarChange !== 0 ? `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}%` : "-"}
      </td>
    </>
  )
}

export default async function ProfitLossComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{
    currentFY?: string
    comparisonFY?: string
    currentFrom?: string
    currentTo?: string
    comparisonFrom?: string
    comparisonTo?: string
  }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const params = await searchParams
  const fyOptions = getFYOptions()

  // Current period
  const currentFYValue = params.currentFY || getCurrentFY()
  const currentFYDates = getFYDates(currentFYValue)
  const currentStart = params.currentFrom ? new Date(params.currentFrom) : currentFYDates.startDate
  const currentEnd = params.currentTo ? new Date(params.currentTo) : currentFYDates.endDate

  // Comparison period: default to previous FY
  const currentStartYear = parseInt(currentFYValue.split("-")[0], 10)
  const defaultCompFY = `${currentStartYear - 1}-${String(currentStartYear).slice(2)}`
  const comparisonFYValue = params.comparisonFY || defaultCompFY
  const comparisonFYDates = getFYDates(comparisonFYValue)
  const comparisonStart = params.comparisonFrom ? new Date(params.comparisonFrom) : comparisonFYDates.startDate
  const comparisonEnd = params.comparisonTo ? new Date(params.comparisonTo) : comparisonFYDates.endDate

  const [currentData, comparisonData] = await Promise.all([
    getPLData(orgId, currentStart, currentEnd),
    getPLData(orgId, comparisonStart, comparisonEnd),
  ])

  // Merge account lists
  const allRevenueIds = new Set([
    ...currentData.revenue.map((a) => a.accountId),
    ...comparisonData.revenue.map((a) => a.accountId),
  ])
  const allExpenseIds = new Set([
    ...currentData.expenses.map((a) => a.accountId),
    ...comparisonData.expenses.map((a) => a.accountId),
  ])

  const currentRevenueMap = new Map(currentData.revenue.map((a) => [a.accountId, a]))
  const comparisonRevenueMap = new Map(comparisonData.revenue.map((a) => [a.accountId, a]))
  const currentExpenseMap = new Map(currentData.expenses.map((a) => [a.accountId, a]))
  const comparisonExpenseMap = new Map(comparisonData.expenses.map((a) => [a.accountId, a]))

  const mergedRevenue = Array.from(allRevenueIds).map((id) => {
    const cur = currentRevenueMap.get(id)
    const cmp = comparisonRevenueMap.get(id)
    const ref = cur || cmp!
    return {
      code: ref.code,
      name: ref.name,
      current: cur?.total || 0,
      comparison: cmp?.total || 0,
      ...calcChange(cur?.total || 0, cmp?.total || 0),
    }
  }).sort((a, b) => a.code.localeCompare(b.code))

  const mergedExpenses = Array.from(allExpenseIds).map((id) => {
    const cur = currentExpenseMap.get(id)
    const cmp = comparisonExpenseMap.get(id)
    const ref = cur || cmp!
    return {
      code: ref.code,
      name: ref.name,
      subType: ref.subType,
      current: cur?.total || 0,
      comparison: cmp?.total || 0,
      ...calcChange(cur?.total || 0, cmp?.total || 0),
    }
  }).sort((a, b) => a.code.localeCompare(b.code))

  const revChange = calcChange(currentData.totalRevenue, comparisonData.totalRevenue)
  const expChange = calcChange(currentData.totalExpenses, comparisonData.totalExpenses)
  const netChange = calcChange(currentData.netProfit, comparisonData.netProfit)

  const currentPeriodLabel = params.currentFrom
    ? formatFYPeriod(currentStart, currentEnd)
    : `FY ${currentFYValue}`
  const comparisonPeriodLabel = params.comparisonFrom
    ? formatFYPeriod(comparisonStart, comparisonEnd)
    : `FY ${comparisonFYValue}`

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">P&amp;L Comparison</h1>
        <p className="mt-1 text-sm text-slate-500">
          {currentPeriodLabel} vs {comparisonPeriodLabel}
        </p>
      </div>

      {/* Period selector hint */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-1">Period Selection</p>
        <p>
          By FY: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?currentFY=2025-26&amp;comparisonFY=2024-25</code>
        </p>
        <p className="mt-1">
          Custom dates: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?currentFrom=2025-07-01&amp;currentTo=2026-06-30&amp;comparisonFrom=2024-07-01&amp;comparisonTo=2025-06-30</code>
        </p>
        <p className="mt-2 text-xs text-slate-400">Available FYs: {fyOptions.map((o) => o.label).join(", ")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Revenue Change</p>
          <p className={`mt-1 text-xl font-bold ${revChange.dollarChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {revChange.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(revChange.dollarChange))}
          </p>
          <p className={`text-sm ${revChange.pctChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {revChange.pctChange >= 0 ? "+" : ""}{revChange.pctChange.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Expense Change</p>
          <p className={`mt-1 text-xl font-bold ${expChange.dollarChange <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {expChange.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(expChange.dollarChange))}
          </p>
          <p className={`text-sm ${expChange.pctChange <= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {expChange.pctChange >= 0 ? "+" : ""}{expChange.pctChange.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Net Profit Change</p>
          <p className={`mt-1 text-xl font-bold ${netChange.dollarChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {netChange.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(netChange.dollarChange))}
          </p>
          <p className={`text-sm ${netChange.pctChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {netChange.pctChange >= 0 ? "+" : ""}{netChange.pctChange.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3 text-right">{currentPeriodLabel}</th>
              <th className="px-4 py-3 text-right">{comparisonPeriodLabel}</th>
              <th className="px-4 py-3 text-right">$ Change</th>
              <th className="px-4 py-3 text-right">% Change</th>
            </tr>
          </thead>
          <tbody>
            {/* Revenue */}
            <tr className="border-b border-slate-200 bg-emerald-50">
              <td colSpan={5} className="px-4 py-3 text-sm font-bold text-emerald-800">Revenue</td>
            </tr>
            {mergedRevenue.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm italic text-slate-400">No revenue entries</td>
              </tr>
            )}
            {mergedRevenue.map((item) => (
              <tr key={item.code} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-sm text-slate-700">
                  <span className="font-mono text-xs text-slate-400 mr-2">{item.code}</span>
                  {item.name}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-900">
                  {formatCurrency(item.current)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-500">
                  {formatCurrency(item.comparison)}
                </td>
                <ChangeCell dollarChange={item.dollarChange} pctChange={item.pctChange} />
              </tr>
            ))}
            <tr className="border-b-2 border-emerald-200 bg-emerald-50/50">
              <td className="px-4 py-3 text-sm font-bold text-emerald-900">Total Revenue</td>
              <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-emerald-900">
                {formatCurrency(currentData.totalRevenue)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-emerald-700">
                {formatCurrency(comparisonData.totalRevenue)}
              </td>
              <ChangeCell dollarChange={revChange.dollarChange} pctChange={revChange.pctChange} />
            </tr>

            <tr><td colSpan={5} className="h-2" /></tr>

            {/* Expenses */}
            <tr className="border-b border-slate-200 bg-rose-50">
              <td colSpan={5} className="px-4 py-3 text-sm font-bold text-rose-800">Expenses</td>
            </tr>
            {mergedExpenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm italic text-slate-400">No expense entries</td>
              </tr>
            )}
            {mergedExpenses.map((item) => (
              <tr key={item.code} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-sm text-slate-700 pl-8">
                  <span className="font-mono text-xs text-slate-400 mr-2">{item.code}</span>
                  {item.name}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-900">
                  {formatCurrency(item.current)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-500">
                  {formatCurrency(item.comparison)}
                </td>
                <ChangeCell dollarChange={item.dollarChange} pctChange={item.pctChange} />
              </tr>
            ))}
            <tr className="border-b-2 border-rose-200 bg-rose-50/50">
              <td className="px-4 py-3 text-sm font-bold text-rose-900">Total Expenses</td>
              <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-rose-900">
                {formatCurrency(currentData.totalExpenses)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-rose-700">
                {formatCurrency(comparisonData.totalExpenses)}
              </td>
              <ChangeCell dollarChange={expChange.dollarChange} pctChange={expChange.pctChange} />
            </tr>

            <tr><td colSpan={5} className="h-2" /></tr>

            {/* Net Profit/Loss */}
            <tr className={`border-t-2 ${currentData.netProfit >= 0 ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
              <td className="px-4 py-4 text-base font-bold text-slate-900">
                {currentData.netProfit >= 0 ? "Net Profit" : "Net Loss"}
              </td>
              <td className={`px-4 py-4 text-right font-mono text-base font-bold tabular-nums ${currentData.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {formatCurrency(Math.abs(currentData.netProfit))}
              </td>
              <td className={`px-4 py-4 text-right font-mono text-base font-bold tabular-nums ${comparisonData.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(Math.abs(comparisonData.netProfit))}
              </td>
              <ChangeCell dollarChange={netChange.dollarChange} pctChange={netChange.pctChange} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
