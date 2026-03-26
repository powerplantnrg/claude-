import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { getCurrentFY, getFYDates, getFYOptions } from "@/lib/financial-year"
import { calculateRdClaim } from "@/lib/claim-calculator"
import Link from "next/link"

type FYRdData = {
  fy: string
  totalExpenses: number
  totalLabour: number
  grandTotal: number
  totalRevenue: number
  rdIntensity: number
  byProject: Map<string, { name: string; expenses: number; labour: number; total: number }>
  byCategory: Map<string, number>
  byActivityType: Map<string, number>
  estimatedOffset: number
  offsetRate: number
  isRefundable: boolean
}

async function getFYRdData(orgId: string, fy: string): Promise<FYRdData> {
  const { startDate, endDate } = getFYDates(fy)

  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  const turnover = org?.aggregatedTurnover ?? 0

  // R&D Expenses
  const rdExpenses = await prisma.rdExpense.findMany({
    where: {
      rdProject: { organizationId: orgId },
      journalLine: {
        journalEntry: {
          status: "Posted",
          date: { gte: startDate, lte: endDate },
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
      rdActivity: { select: { id: true, name: true, activityType: true } },
    },
  })

  // Time entries
  const timeEntries = await prisma.rdTimeEntry.findMany({
    where: {
      rdActivity: { rdProject: { organizationId: orgId } },
      date: { gte: startDate, lte: endDate },
    },
    include: {
      rdActivity: {
        include: {
          rdProject: { select: { id: true, name: true } },
        },
      },
    },
  })

  // Revenue for R&D intensity
  const revenueLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: startDate, lte: endDate },
      },
      account: { type: "Revenue" },
    },
  })
  const totalRevenue = revenueLines.reduce((s, l) => s + l.credit - l.debit, 0)

  // Aggregate by project
  const byProject = new Map<string, { name: string; expenses: number; labour: number; total: number }>()
  const byCategory = new Map<string, number>()
  const byActivityType = new Map<string, number>()

  for (const expense of rdExpenses) {
    const projId = expense.rdProject.id
    const existing = byProject.get(projId) || { name: expense.rdProject.name, expenses: 0, labour: 0, total: 0 }
    const amount = expense.journalLine?.debit || 0
    existing.expenses += amount
    existing.total += amount
    byProject.set(projId, existing)

    // Category
    byCategory.set(expense.category, (byCategory.get(expense.category) || 0) + amount)

    // Activity type
    const actType = expense.rdActivity?.activityType || "Core"
    byActivityType.set(actType, (byActivityType.get(actType) || 0) + amount)
  }

  for (const entry of timeEntries) {
    const projId = entry.rdActivity.rdProject.id
    const existing = byProject.get(projId) || { name: entry.rdActivity.rdProject.name, expenses: 0, labour: 0, total: 0 }
    const amount = entry.hours * (entry.hourlyRate || 0)
    existing.labour += amount
    existing.total += amount
    byProject.set(projId, existing)

    const actType = entry.rdActivity.activityType || "Core"
    byActivityType.set(actType, (byActivityType.get(actType) || 0) + amount)
  }

  const totalExpenses = rdExpenses.reduce((s, e) => s + (e.journalLine?.debit || 0), 0)
  const totalLabour = timeEntries.reduce((s, e) => s + e.hours * (e.hourlyRate || 0), 0)
  const grandTotal = totalExpenses + totalLabour
  const rdIntensity = totalRevenue > 0 ? (grandTotal / totalRevenue) * 100 : 0

  const eligibleExpenditure = rdExpenses
    .filter((e) => e.classification !== "NonEligible")
    .reduce((s, e) => s + (e.journalLine?.debit || 0), 0) + totalLabour

  const claim = calculateRdClaim(eligibleExpenditure, turnover)

  return {
    fy,
    totalExpenses,
    totalLabour,
    grandTotal,
    totalRevenue,
    rdIntensity,
    byProject,
    byCategory,
    byActivityType,
    estimatedOffset: claim.estimatedOffset,
    offsetRate: claim.offsetRate,
    isRefundable: claim.isRefundable,
  }
}

function calcChange(current: number, comparison: number) {
  const dollarChange = current - comparison
  const pctChange = comparison !== 0 ? ((current - comparison) / Math.abs(comparison)) * 100 : current !== 0 ? 100 : 0
  return { dollarChange, pctChange }
}

export default async function RdComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{ fy1?: string; fy2?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const params = await searchParams
  const fyOptions = getFYOptions()
  const currentFY = params.fy1 || getCurrentFY()
  const startYear = parseInt(currentFY.split("-")[0], 10)
  const prevFY = params.fy2 || `${startYear - 1}-${String(startYear).slice(2)}`

  const [currentData, prevData] = await Promise.all([
    getFYRdData(orgId, currentFY),
    getFYRdData(orgId, prevFY),
  ])

  const spendChange = calcChange(currentData.grandTotal, prevData.grandTotal)
  const intensityChange = calcChange(currentData.rdIntensity, prevData.rdIntensity)
  const offsetChange = calcChange(currentData.estimatedOffset, prevData.estimatedOffset)

  // Merge projects
  const allProjectIds = new Set([
    ...currentData.byProject.keys(),
    ...prevData.byProject.keys(),
  ])
  const projectComparison = Array.from(allProjectIds).map((id) => {
    const cur = currentData.byProject.get(id)
    const prev = prevData.byProject.get(id)
    const name = cur?.name || prev?.name || "Unknown"
    const curTotal = cur?.total || 0
    const prevTotal = prev?.total || 0
    return { id, name, current: curTotal, previous: prevTotal, ...calcChange(curTotal, prevTotal) }
  }).sort((a, b) => b.current - a.current)

  // Merge categories
  const allCategories = new Set([
    ...currentData.byCategory.keys(),
    ...prevData.byCategory.keys(),
  ])
  const categoryComparison = Array.from(allCategories).map((cat) => {
    const curVal = currentData.byCategory.get(cat) || 0
    const prevVal = prevData.byCategory.get(cat) || 0
    return { category: cat, current: curVal, previous: prevVal, ...calcChange(curVal, prevVal) }
  }).sort((a, b) => b.current - a.current)

  // Activity type comparison
  const allActivityTypes = new Set([
    ...currentData.byActivityType.keys(),
    ...prevData.byActivityType.keys(),
  ])
  const activityTypeComparison = Array.from(allActivityTypes).map((type) => {
    const curVal = currentData.byActivityType.get(type) || 0
    const prevVal = prevData.byActivityType.get(type) || 0
    return { type, current: curVal, previous: prevVal, ...calcChange(curVal, prevVal) }
  }).sort((a, b) => b.current - a.current)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">R&amp;D Expenditure Comparison</h1>
        <p className="mt-1 text-sm text-slate-500">
          FY {currentFY} vs FY {prevFY}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p>
          Select years: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?fy1=2025-26&amp;fy2=2024-25</code>
        </p>
        <p className="mt-2 text-xs text-slate-400">Available FYs: {fyOptions.map((o) => o.label).join(", ")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total R&amp;D Spend</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(currentData.grandTotal)}</p>
          <p className={`text-sm ${spendChange.dollarChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {spendChange.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(spendChange.dollarChange))} ({spendChange.pctChange >= 0 ? "+" : ""}{spendChange.pctChange.toFixed(1)}%)
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">R&amp;D Intensity</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{currentData.rdIntensity.toFixed(1)}%</p>
          <p className={`text-sm ${intensityChange.dollarChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {intensityChange.dollarChange >= 0 ? "\u2191" : "\u2193"} {Math.abs(intensityChange.dollarChange).toFixed(1)}pp from {prevData.rdIntensity.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400">R&amp;D spend / revenue</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Estimated Tax Offset</p>
          <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(currentData.estimatedOffset)}</p>
          <p className={`text-sm ${offsetChange.dollarChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {offsetChange.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(offsetChange.dollarChange))}
          </p>
          <p className="text-xs text-slate-400">
            {currentData.isRefundable ? "Refundable (43.5%)" : "Non-refundable (38.5%)"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Revenue (for context)</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(currentData.totalRevenue)}</p>
          {(() => {
            const revChange = calcChange(currentData.totalRevenue, prevData.totalRevenue)
            return (
              <p className={`text-sm ${revChange.dollarChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {revChange.dollarChange >= 0 ? "\u2191" : "\u2193"} {revChange.pctChange >= 0 ? "+" : ""}{revChange.pctChange.toFixed(1)}% vs prior year
              </p>
            )
          })()}
        </div>
      </div>

      {/* By Project */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">By Project</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3 text-right">FY {currentFY}</th>
              <th className="px-4 py-3 text-right">FY {prevFY}</th>
              <th className="px-4 py-3 text-right">$ Change</th>
              <th className="px-4 py-3 text-right">% Change</th>
            </tr>
          </thead>
          <tbody>
            {projectComparison.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No R&amp;D projects found</td>
              </tr>
            ) : (
              projectComparison.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-sm font-medium text-slate-900">
                    <Link href={`/rd/projects/${p.id}`} className="hover:text-indigo-600">{p.name}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-900">
                    {formatCurrency(p.current)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-500">
                    {formatCurrency(p.previous)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono text-sm tabular-nums ${p.dollarChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {p.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(p.dollarChange))}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono text-sm tabular-nums ${p.pctChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {p.dollarChange !== 0 ? `${p.pctChange >= 0 ? "+" : ""}${p.pctChange.toFixed(1)}%` : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {projectComparison.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                <td className="px-4 py-3 text-sm font-bold text-indigo-900">Total</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-indigo-900">
                  {formatCurrency(currentData.grandTotal)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-indigo-900">
                  {formatCurrency(prevData.grandTotal)}
                </td>
                <td className={`px-4 py-3 text-right font-mono text-sm font-bold tabular-nums ${spendChange.dollarChange >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {spendChange.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(spendChange.dollarChange))}
                </td>
                <td className={`px-4 py-3 text-right font-mono text-sm font-bold tabular-nums ${spendChange.pctChange >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {spendChange.pctChange >= 0 ? "+" : ""}{spendChange.pctChange.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* By Category */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">By Category</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">FY {currentFY}</th>
              <th className="px-4 py-3 text-right">FY {prevFY}</th>
              <th className="px-4 py-3 text-right">$ Change</th>
              <th className="px-4 py-3 text-right">% Change</th>
            </tr>
          </thead>
          <tbody>
            {categoryComparison.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No category data</td>
              </tr>
            ) : (
              categoryComparison.map((c) => (
                <tr key={c.category} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-sm font-medium text-slate-700">{c.category}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-900">
                    {formatCurrency(c.current)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-500">
                    {formatCurrency(c.previous)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono text-sm tabular-nums ${c.dollarChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {c.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(c.dollarChange))}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono text-sm tabular-nums ${c.pctChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {c.dollarChange !== 0 ? `${c.pctChange >= 0 ? "+" : ""}${c.pctChange.toFixed(1)}%` : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* By Activity Type (Core vs Supporting) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">By Activity Type</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Activity Type</th>
              <th className="px-4 py-3 text-right">FY {currentFY}</th>
              <th className="px-4 py-3 text-right">FY {prevFY}</th>
              <th className="px-4 py-3 text-right">$ Change</th>
              <th className="px-4 py-3 text-right">% Change</th>
            </tr>
          </thead>
          <tbody>
            {activityTypeComparison.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No activity type data</td>
              </tr>
            ) : (
              activityTypeComparison.map((a) => (
                <tr key={a.type} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-sm font-medium text-slate-700">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.type === "Core" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700"
                    }`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-900">
                    {formatCurrency(a.current)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-500">
                    {formatCurrency(a.previous)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono text-sm tabular-nums ${a.dollarChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {a.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(a.dollarChange))}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono text-sm tabular-nums ${a.pctChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {a.dollarChange !== 0 ? `${a.pctChange >= 0 ? "+" : ""}${a.pctChange.toFixed(1)}%` : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tax Offset Comparison */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Tax Offset Comparison</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 mb-2">FY {currentFY}</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(currentData.estimatedOffset)}</p>
            <p className="text-sm text-slate-500 mt-1">
              Rate: {(currentData.offsetRate * 100).toFixed(1)}% ({currentData.isRefundable ? "Refundable" : "Non-refundable"})
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">FY {prevFY}</p>
            <p className="text-2xl font-bold text-slate-700">{formatCurrency(prevData.estimatedOffset)}</p>
            <p className="text-sm text-slate-500 mt-1">
              Rate: {(prevData.offsetRate * 100).toFixed(1)}% ({prevData.isRefundable ? "Refundable" : "Non-refundable"})
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
