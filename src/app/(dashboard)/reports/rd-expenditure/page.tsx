import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  calculateRdClaim,
  generateClaimBreakdown,
} from "@/lib/claim-calculator"
import Link from "next/link"

function getFinancialYearDates(year?: string): { start: Date; end: Date; label: string } {
  const now = new Date()
  if (year) {
    const fy = parseInt(year, 10)
    return {
      start: new Date(fy - 1, 6, 1),
      end: new Date(fy, 5, 30, 23, 59, 59),
      label: `FY ${fy - 1}/${fy}`,
    }
  }
  const fyEnd = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  return {
    start: new Date(fyEnd - 1, 6, 1),
    end: new Date(fyEnd, 5, 30, 23, 59, 59),
    label: `FY ${fyEnd - 1}/${fyEnd}`,
  }
}

export default async function RdExpenditurePage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const params = await searchParams
  const fyDates = getFinancialYearDates(params.fy)

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  })

  // Get all R&D expenses with journal entry date filtering
  const rdExpenses = await prisma.rdExpense.findMany({
    where: {
      rdProject: { organizationId: orgId },
      journalLine: {
        journalEntry: {
          status: "Posted",
          date: { gte: fyDates.start, lte: fyDates.end },
        },
      },
    },
    include: {
      journalLine: {
        include: {
          account: true,
          journalEntry: true,
        },
      },
      rdProject: { select: { id: true, name: true } },
      rdActivity: { select: { id: true, name: true } },
    },
  })

  // Get time entries within the period
  const timeEntries = await prisma.rdTimeEntry.findMany({
    where: {
      rdActivity: { rdProject: { organizationId: orgId } },
      date: { gte: fyDates.start, lte: fyDates.end },
    },
    include: {
      rdActivity: {
        include: {
          rdProject: { select: { id: true, name: true } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })

  // Calculate expense totals by project
  const projectExpenses = new Map<string, { name: string; expenses: number; labour: number }>()

  for (const expense of rdExpenses) {
    const projId = expense.rdProject.id
    const existing = projectExpenses.get(projId) || {
      name: expense.rdProject.name,
      expenses: 0,
      labour: 0,
    }
    existing.expenses += expense.journalLine?.debit || 0
    projectExpenses.set(projId, existing)
  }

  for (const entry of timeEntries) {
    const projId = entry.rdActivity.rdProject.id
    const existing = projectExpenses.get(projId) || {
      name: entry.rdActivity.rdProject.name,
      expenses: 0,
      labour: 0,
    }
    existing.labour += entry.hours * (entry.hourlyRate || 0)
    projectExpenses.set(projId, existing)
  }

  const projectRows = Array.from(projectExpenses.entries()).map(([id, data]) => ({
    id,
    ...data,
    total: data.expenses + data.labour,
  })).sort((a, b) => b.total - a.total)

  // Category breakdown for claim estimate
  const expensesForBreakdown = rdExpenses
    .filter((e) => e.classification !== "NonEligible")
    .map((e) => ({
      category: e.category,
      amount: e.journalLine?.debit || 0,
    }))

  const labourTotal = timeEntries.reduce(
    (sum, e) => sum + e.hours * (e.hourlyRate || 0),
    0
  )

  if (labourTotal > 0) {
    expensesForBreakdown.push({ category: "Labour", amount: labourTotal })
  }

  const breakdown = generateClaimBreakdown(expensesForBreakdown)
  const turnover = org?.aggregatedTurnover ?? 0
  const claimResult = calculateRdClaim(breakdown.totalEligible, turnover)

  const totalExpenses = rdExpenses.reduce(
    (sum, e) => sum + (e.journalLine?.debit || 0),
    0
  )
  const totalLabour = labourTotal
  const totalTimeHours = timeEntries.reduce((sum, e) => sum + e.hours, 0)
  const grandTotal = totalExpenses + totalLabour

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">R&D Expenditure Report</h1>
        <p className="mt-1 text-sm text-slate-500">
          {fyDates.label} &mdash; R&D Tax Incentive expenditure summary
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Select financial year:{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?fy=2026</code>
      </div>

      {/* Claim Estimate Banner */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              R&D Tax Incentive Estimate
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {fyDates.label}
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              turnover < 20_000_000
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {turnover < 20_000_000
              ? "Refundable (43.5%)"
              : "Non-refundable (38.5%)"}
          </span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">Total R&D Spend</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(grandTotal)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Eligible Expenditure</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(breakdown.totalEligible)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Offset Rate</p>
            <p className="mt-1 text-2xl font-bold text-indigo-600">
              {(claimResult.offsetRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Estimated Offset</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(claimResult.estimatedOffset)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Direct Expenses</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatCurrency(totalExpenses)}
          </p>
          <p className="text-xs text-slate-400">{rdExpenses.length} line items</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Labour Costs</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatCurrency(totalLabour)}
          </p>
          <p className="text-xs text-slate-400">{totalTimeHours.toFixed(1)} hours tracked</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Projects</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {projectRows.length}
          </p>
          <p className="text-xs text-slate-400">with R&D expenditure</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Team Members</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {new Set(timeEntries.map((e) => e.userId)).size}
          </p>
          <p className="text-xs text-slate-400">contributing to R&D</p>
        </div>
      </div>

      {/* By Project */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Expenditure by Project</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Project</th>
              <th className="px-6 py-3 text-right">Direct Expenses</th>
              <th className="px-6 py-3 text-right">Labour</th>
              <th className="px-6 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {projectRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">
                  No R&D expenditure recorded for this period
                </td>
              </tr>
            ) : (
              projectRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">
                    <Link href={`/rd/projects/${row.id}`} className="hover:text-indigo-600">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                    {formatCurrency(row.expenses)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                    {formatCurrency(row.labour)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-sm font-semibold tabular-nums text-slate-900">
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {projectRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                <td className="px-6 py-3 text-sm font-bold text-indigo-900">Grand Total</td>
                <td className="px-6 py-3 text-right font-mono text-sm font-bold tabular-nums text-indigo-900">
                  {formatCurrency(totalExpenses)}
                </td>
                <td className="px-6 py-3 text-right font-mono text-sm font-bold tabular-nums text-indigo-900">
                  {formatCurrency(totalLabour)}
                </td>
                <td className="px-6 py-3 text-right font-mono text-sm font-bold tabular-nums text-indigo-900">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Category Breakdown */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Breakdown by Category</h2>
        </div>
        {breakdown.items.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            No eligible expenditure categories found
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {breakdown.items.map((item) => (
              <div
                key={item.category}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-600">
                    {item.percentage.toFixed(0)}%
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-32">
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-28 text-right text-sm font-medium text-slate-900">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
