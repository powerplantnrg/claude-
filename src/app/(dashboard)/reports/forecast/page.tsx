import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import {
  projectRevenue,
  projectExpenses,
  projectCashFlow,
} from "@/lib/forecasting"
import { ForecastChart } from "./forecast-charts"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Financial Forecast",
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

export default async function ForecastPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  // Get the last 6 months of historical data for more context
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

  // Fetch posted journal lines from the last 6 months
  const journalLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: sixMonthsAgo, lte: now },
      },
    },
    include: {
      account: { select: { type: true, isRdEligible: true } },
      journalEntry: { select: { date: true } },
    },
  })

  // Group by month: revenue, expenses, R&D spend
  const monthlyData: Record<
    string,
    { revenue: number; expenses: number; rdSpend: number }
  > = {}

  for (const line of journalLines) {
    const date = line.journalEntry.date
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    if (!monthlyData[key]) {
      monthlyData[key] = { revenue: 0, expenses: 0, rdSpend: 0 }
    }

    if (line.account.type === "Revenue") {
      // Revenue = credits - debits
      monthlyData[key].revenue += line.credit - line.debit
    } else if (
      line.account.type === "Expense" ||
      line.account.type === "Cost of Sales"
    ) {
      // Expenses = debits - credits
      monthlyData[key].expenses += line.debit - line.credit
      if (line.account.isRdEligible) {
        monthlyData[key].rdSpend += line.debit - line.credit
      }
    }
  }

  // Sort months chronologically
  const sortedKeys = Object.keys(monthlyData).sort()
  const historicalRevenue = sortedKeys.map((k) => monthlyData[k].revenue)
  const historicalExpenses = sortedKeys.map((k) => monthlyData[k].expenses)
  const historicalRdSpend = sortedKeys.map((k) => monthlyData[k].rdSpend)
  const historicalLabels = sortedKeys.map((k) => {
    const [y, m] = k.split("-")
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y.slice(2)}`
  })

  // Use last 3 months for projections
  const last3Revenue = historicalRevenue.slice(-3)
  const last3Expenses = historicalExpenses.slice(-3)
  const last3RdSpend = historicalRdSpend.slice(-3)

  // Project 12 months forward
  const forecastMonths = 12
  const projectedRev = projectRevenue(last3Revenue, forecastMonths)
  const projectedExp = projectExpenses(last3Expenses, forecastMonths)
  const projectedRd = projectExpenses(last3RdSpend, forecastMonths)

  // Calculate starting cash balance from bank accounts
  const bankAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      type: "Asset",
      OR: [
        { subType: { in: ["Bank", "Cash"] } },
        { name: { contains: "Bank" } },
      ],
    },
  })

  let cashBalance = 0
  if (bankAccounts.length > 0) {
    const bankLines = await prisma.journalLine.findMany({
      where: {
        accountId: { in: bankAccounts.map((a) => a.id) },
        journalEntry: { organizationId: orgId, status: "Posted" },
      },
    })
    cashBalance = bankLines.reduce(
      (sum, line) => sum + line.debit - line.credit,
      0
    )
  }

  const projectedCash = projectCashFlow(cashBalance, projectedRev, projectedExp)

  // R&D tax offset (43.5% for turnover under $20M in Australia)
  const rdOffsetRate = 0.435
  const projectedRdTotal = projectedRd.reduce((s, v) => s + v, 0)
  const estimatedRdOffset = projectedRdTotal * rdOffsetRate

  // Generate projected month labels
  const projectedLabels: string[] = []
  for (let i = 1; i <= forecastMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    projectedLabels.push(
      `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
    )
  }

  const projectedNet = projectedRev.map(
    (r, i) => Math.round((r - projectedExp[i]) * 100) / 100
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Financial Forecast
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          12-month projection based on recent actuals (last 3 months trend)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Current Cash Balance
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatCurrency(cashBalance)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Projected Revenue (12m)
          </p>
          <p className="mt-1 text-xl font-bold text-green-600">
            {formatCurrency(projectedRev.reduce((s, v) => s + v, 0))}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Projected Expenses (12m)
          </p>
          <p className="mt-1 text-xl font-bold text-red-600">
            {formatCurrency(projectedExp.reduce((s, v) => s + v, 0))}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Projected R&D Spend (12m)
          </p>
          <p className="mt-1 text-xl font-bold text-indigo-600">
            {formatCurrency(projectedRdTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Est. R&D Tax Offset
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-600">
            {formatCurrency(estimatedRdOffset)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            @ {(rdOffsetRate * 100).toFixed(1)}% offset rate
          </p>
        </div>
      </div>

      {/* Chart */}
      <ForecastChart
        historicalLabels={historicalLabels}
        historicalRevenue={historicalRevenue}
        historicalExpenses={historicalExpenses}
        projectedLabels={projectedLabels}
        projectedRevenue={projectedRev}
        projectedExpenses={projectedExp}
        projectedCashFlow={projectedCash}
      />

      {/* Revenue Forecast */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="px-6 py-4 text-lg font-semibold text-slate-900 border-b border-slate-200">
          Revenue Forecast (Linear Projection)
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Month
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Projected Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectedLabels.map((label, i) => (
                <tr key={label} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm text-slate-700">{label}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-green-600">
                    {formatCurrency(projectedRev[i])}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                <td className="px-6 py-3 text-sm text-slate-900">Total</td>
                <td className="px-6 py-3 text-right text-sm text-green-700">
                  {formatCurrency(projectedRev.reduce((s, v) => s + v, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Expense Forecast */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="px-6 py-4 text-lg font-semibold text-slate-900 border-b border-slate-200">
          Expense Forecast (Moving Average)
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Month
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Projected Expenses
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Of Which R&D
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectedLabels.map((label, i) => (
                <tr key={label} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm text-slate-700">{label}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-red-600">
                    {formatCurrency(projectedExp[i])}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-indigo-600">
                    {formatCurrency(projectedRd[i])}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                <td className="px-6 py-3 text-sm text-slate-900">Total</td>
                <td className="px-6 py-3 text-right text-sm text-red-700">
                  {formatCurrency(projectedExp.reduce((s, v) => s + v, 0))}
                </td>
                <td className="px-6 py-3 text-right text-sm text-indigo-700">
                  {formatCurrency(projectedRdTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Cash Flow Projection */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="px-6 py-4 text-lg font-semibold text-slate-900 border-b border-slate-200">
          Cash Flow Projection
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Month
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Projected Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Projected Expenses
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Projected Net
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Projected Cash Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectedLabels.map((label, i) => (
                <tr key={label} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm text-slate-700">{label}</td>
                  <td className="px-6 py-3 text-right text-sm text-green-600">
                    {formatCurrency(projectedRev[i])}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-red-600">
                    {formatCurrency(projectedExp[i])}
                  </td>
                  <td
                    className={`px-6 py-3 text-right text-sm font-medium ${projectedNet[i] >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(projectedNet[i])}
                  </td>
                  <td
                    className={`px-6 py-3 text-right text-sm font-semibold ${projectedCash[i] >= 0 ? "text-slate-900" : "text-red-600"}`}
                  >
                    {formatCurrency(projectedCash[i])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* R&D Tax Offset Impact */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Estimated R&D Tax Offset Impact
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-100 p-4">
            <p className="text-sm text-slate-500">
              Projected R&D Expenditure (12m)
            </p>
            <p className="mt-1 text-lg font-bold text-indigo-600">
              {formatCurrency(projectedRdTotal)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 p-4">
            <p className="text-sm text-slate-500">
              R&D Tax Offset Rate
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {(rdOffsetRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">
              Refundable offset (turnover &lt; $20M)
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">
              Estimated Tax Offset
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-700">
              {formatCurrency(estimatedRdOffset)}
            </p>
            <p className="text-xs text-emerald-600">
              Cash position after offset:{" "}
              {formatCurrency(
                projectedCash[projectedCash.length - 1] + estimatedRdOffset
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
