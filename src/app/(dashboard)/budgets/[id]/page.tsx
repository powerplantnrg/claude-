import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Budget vs Actual",
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const

const FY_MONTH_ORDER = [
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
] as const

const MONTH_LABELS = [
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
]

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id } = await params

  const budget = await prisma.budget.findFirst({
    where: { id, organizationId: orgId },
    include: {
      items: { include: { account: true } },
    },
  })

  if (!budget) redirect("/budgets")

  // Compute actuals from journal lines
  const fyParts = budget.financialYear.split("-")
  const startYear = parseInt(fyParts[0], 10)
  const fyStart = new Date(startYear, 6, 1)
  const fyEnd = new Date(startYear + 1, 5, 30, 23, 59, 59)

  const accountIds = budget.items.map((item) => item.accountId)

  const journalLines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: accountIds },
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: fyStart, lte: fyEnd },
      },
    },
    include: {
      journalEntry: { select: { date: true } },
    },
  })

  // Group actuals by account and month
  const actualsByAccountMonth: Record<string, Record<string, number>> = {}
  for (const line of journalLines) {
    const accId = line.accountId
    const month = line.journalEntry.date.getMonth()
    const monthKey = MONTHS[month]
    if (!actualsByAccountMonth[accId]) {
      actualsByAccountMonth[accId] = {}
    }
    const amount = line.debit - line.credit
    actualsByAccountMonth[accId][monthKey] =
      (actualsByAccountMonth[accId][monthKey] ?? 0) + amount
  }

  const itemsWithActuals = budget.items.map((item) => {
    const actuals = actualsByAccountMonth[item.accountId] ?? {}
    const monthlyActuals: Record<string, number> = {}
    let actualTotal = 0

    for (const m of MONTHS) {
      const val = Math.round((actuals[m] ?? 0) * 100) / 100
      monthlyActuals[m] = val
      actualTotal += val
    }
    actualTotal = Math.round(actualTotal * 100) / 100

    return {
      ...item,
      actuals: monthlyActuals,
      actualTotal,
      varianceDollar: Math.round((item.total - actualTotal) * 100) / 100,
      variancePercent:
        item.total !== 0
          ? Math.round(
              ((item.total - actualTotal) / item.total) * 100 * 100
            ) / 100
          : 0,
    }
  })

  const summaryBudgetTotal = itemsWithActuals.reduce(
    (s, i) => s + i.total,
    0
  )
  const summaryActualTotal = itemsWithActuals.reduce(
    (s, i) => s + i.actualTotal,
    0
  )
  const summaryVarianceDollar = Math.round(
    (summaryBudgetTotal - summaryActualTotal) * 100
  ) / 100
  const summaryVariancePercent =
    summaryBudgetTotal !== 0
      ? Math.round(
          ((summaryBudgetTotal - summaryActualTotal) / summaryBudgetTotal) *
            100 *
            100
        ) / 100
      : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/budgets" className="hover:text-indigo-600">
              Budgets
            </Link>
            <span>/</span>
            <span>{budget.name}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {budget.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            FY {budget.financialYear} &mdash; Budget vs Actual Comparison
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            budget.status === "Active"
              ? "bg-green-50 text-green-700"
              : budget.status === "Closed"
                ? "bg-slate-100 text-slate-600"
                : "bg-amber-50 text-amber-700"
          }`}
        >
          {budget.status}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Budget</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(summaryBudgetTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Actual</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(summaryActualTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Variance ($)</p>
          <p
            className={`mt-1 text-2xl font-bold ${summaryVarianceDollar >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {formatCurrency(summaryVarianceDollar)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Variance (%)</p>
          <p
            className={`mt-1 text-2xl font-bold ${summaryVariancePercent >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {summaryVariancePercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Budget vs Actual Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[200px]">
                Account
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Budget
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actual
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Variance ($)
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Variance (%)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[200px]">
                Progress
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itemsWithActuals.map((item) => {
              const usagePercent =
                item.total > 0
                  ? Math.min(
                      (item.actualTotal / item.total) * 100,
                      100
                    )
                  : 0
              const isOver = item.actualTotal > item.total && item.total > 0

              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    <span className="text-slate-400 mr-2">
                      {item.account.code}
                    </span>
                    {item.account.name}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatCurrency(item.total)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatCurrency(item.actualTotal)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${item.varianceDollar >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(item.varianceDollar)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${item.variancePercent >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {item.variancePercent.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : "bg-green-500"}`}
                          style={{
                            width: `${Math.min(usagePercent, 100)}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium min-w-[40px] text-right ${isOver ? "text-red-600" : "text-slate-600"}`}
                      >
                        {usagePercent.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr>
              <td className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-slate-900">
                Total
              </td>
              <td className="px-4 py-3 text-right text-slate-900">
                {formatCurrency(summaryBudgetTotal)}
              </td>
              <td className="px-4 py-3 text-right text-slate-900">
                {formatCurrency(summaryActualTotal)}
              </td>
              <td
                className={`px-4 py-3 text-right ${summaryVarianceDollar >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(summaryVarianceDollar)}
              </td>
              <td
                className={`px-4 py-3 text-right ${summaryVariancePercent >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {summaryVariancePercent.toFixed(1)}%
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${summaryActualTotal > summaryBudgetTotal ? "bg-red-500" : "bg-green-500"}`}
                      style={{
                        width: `${summaryBudgetTotal > 0 ? Math.min((summaryActualTotal / summaryBudgetTotal) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium min-w-[40px] text-right ${summaryActualTotal > summaryBudgetTotal ? "text-red-600" : "text-slate-600"}`}
                  >
                    {summaryBudgetTotal > 0
                      ? ((summaryActualTotal / summaryBudgetTotal) * 100).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Monthly Breakdown */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="px-6 py-4 text-lg font-semibold text-slate-900 border-b border-slate-200">
          Monthly Breakdown
        </h2>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[200px]">
                Account
              </th>
              {MONTH_LABELS.map((label) => (
                <th
                  key={label}
                  className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itemsWithActuals.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                  {item.account.name}
                </td>
                {FY_MONTH_ORDER.map((month) => {
                  const budgetVal = (item as any)[month] as number
                  const actualVal = item.actuals[month]
                  const isOverMonth = actualVal > budgetVal && budgetVal > 0

                  return (
                    <td key={month} className="px-3 py-3 text-center">
                      <div className="text-xs text-slate-500">
                        B: {formatCurrency(budgetVal)}
                      </div>
                      <div
                        className={`text-xs font-medium ${isOverMonth ? "text-red-600" : "text-green-600"}`}
                      >
                        A: {formatCurrency(actualVal)}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
