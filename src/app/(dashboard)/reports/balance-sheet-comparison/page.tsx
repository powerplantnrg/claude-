import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { getCurrentFY, getFYDates, getFYOptions } from "@/lib/financial-year"
import Link from "next/link"

type AccountBalance = {
  accountId: string
  code: string
  name: string
  type: string
  balance: number
}

async function getBalanceSheetData(orgId: string, asOfDate: Date) {
  const journalLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { lte: asOfDate },
      },
      account: {
        type: { in: ["Asset", "Liability", "Equity"] },
      },
    },
    include: { account: true },
  })

  const balances = new Map<string, AccountBalance>()
  for (const line of journalLines) {
    const netAmount = line.account.type === "Asset"
      ? line.debit - line.credit
      : line.credit - line.debit
    const existing = balances.get(line.accountId)
    if (existing) {
      existing.balance += netAmount
    } else {
      balances.set(line.accountId, {
        accountId: line.accountId,
        code: line.account.code,
        name: line.account.name,
        type: line.account.type,
        balance: netAmount,
      })
    }
  }

  // Retained earnings from P&L
  const plLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { lte: asOfDate },
      },
      account: { type: { in: ["Revenue", "Expense"] } },
    },
    include: { account: true },
  })

  let retainedEarnings = 0
  for (const line of plLines) {
    if (line.account.type === "Revenue") {
      retainedEarnings += line.credit - line.debit
    } else {
      retainedEarnings -= line.debit - line.credit
    }
  }

  const all = Array.from(balances.values())
  const assets = all.filter((a) => a.type === "Asset").sort((a, b) => a.code.localeCompare(b.code))
  const liabilities = all.filter((a) => a.type === "Liability").sort((a, b) => a.code.localeCompare(b.code))
  const equity = all.filter((a) => a.type === "Equity").sort((a, b) => a.code.localeCompare(b.code))

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0)
  const totalEquity = equity.reduce((s, a) => s + a.balance, 0)

  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, retainedEarnings }
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

function mergeAccountSections(
  currentAccounts: AccountBalance[],
  comparisonAccounts: AccountBalance[]
) {
  const allIds = new Set([
    ...currentAccounts.map((a) => a.accountId),
    ...comparisonAccounts.map((a) => a.accountId),
  ])
  const curMap = new Map(currentAccounts.map((a) => [a.accountId, a]))
  const cmpMap = new Map(comparisonAccounts.map((a) => [a.accountId, a]))

  return Array.from(allIds).map((id) => {
    const cur = curMap.get(id)
    const cmp = cmpMap.get(id)
    const ref = cur || cmp!
    return {
      code: ref.code,
      name: ref.name,
      current: cur?.balance || 0,
      comparison: cmp?.balance || 0,
      ...calcChange(cur?.balance || 0, cmp?.balance || 0),
    }
  }).sort((a, b) => a.code.localeCompare(b.code))
}

export default async function BalanceSheetComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{
    currentDate?: string
    comparisonDate?: string
    currentFY?: string
    comparisonFY?: string
  }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const params = await searchParams
  const fyOptions = getFYOptions()

  // Current date: end of current FY by default, or specific date
  const currentFYValue = params.currentFY || getCurrentFY()
  const currentFYDates = getFYDates(currentFYValue)
  const currentDate = params.currentDate ? new Date(params.currentDate) : currentFYDates.endDate

  // Comparison date: end of previous FY by default
  const currentStartYear = parseInt(currentFYValue.split("-")[0], 10)
  const defaultCompFY = `${currentStartYear - 1}-${String(currentStartYear).slice(2)}`
  const comparisonFYValue = params.comparisonFY || defaultCompFY
  const comparisonFYDates = getFYDates(comparisonFYValue)
  const comparisonDate = params.comparisonDate ? new Date(params.comparisonDate) : comparisonFYDates.endDate

  const [currentData, comparisonData] = await Promise.all([
    getBalanceSheetData(orgId, currentDate),
    getBalanceSheetData(orgId, comparisonDate),
  ])

  const mergedAssets = mergeAccountSections(currentData.assets, comparisonData.assets)
  const mergedLiabilities = mergeAccountSections(currentData.liabilities, comparisonData.liabilities)
  const mergedEquity = mergeAccountSections(currentData.equity, comparisonData.equity)

  const assetChange = calcChange(currentData.totalAssets, comparisonData.totalAssets)
  const liabilityChange = calcChange(currentData.totalLiabilities, comparisonData.totalLiabilities)
  const equityChange = calcChange(
    currentData.totalEquity + currentData.retainedEarnings,
    comparisonData.totalEquity + comparisonData.retainedEarnings
  )

  const fmtDate = (d: Date) => d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })
  const currentLabel = fmtDate(currentDate)
  const comparisonLabel = fmtDate(comparisonDate)

  function SectionRows({
    title,
    items,
    totalCurrent,
    totalComparison,
    colorClass,
    bgClass,
  }: {
    title: string
    items: ReturnType<typeof mergeAccountSections>
    totalCurrent: number
    totalComparison: number
    colorClass: string
    bgClass: string
  }) {
    const totChange = calcChange(totalCurrent, totalComparison)
    return (
      <>
        <tr className={`border-b border-slate-200 ${bgClass}`}>
          <td colSpan={5} className={`px-4 py-3 text-sm font-bold ${colorClass}`}>{title}</td>
        </tr>
        {items.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-3 text-sm italic text-slate-400">No {title.toLowerCase()} accounts</td>
          </tr>
        ) : (
          items.map((item) => (
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
          ))
        )}
        <tr className={`border-b-2 ${bgClass}`}>
          <td className={`px-4 py-3 text-sm font-bold ${colorClass}`}>Total {title}</td>
          <td className={`px-4 py-3 text-right font-mono text-sm font-bold tabular-nums ${colorClass}`}>
            {formatCurrency(totalCurrent)}
          </td>
          <td className={`px-4 py-3 text-right font-mono text-sm font-bold tabular-nums ${colorClass}`}>
            {formatCurrency(totalComparison)}
          </td>
          <ChangeCell dollarChange={totChange.dollarChange} pctChange={totChange.pctChange} />
        </tr>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Balance Sheet Comparison</h1>
        <p className="mt-1 text-sm text-slate-500">
          {currentLabel} vs {comparisonLabel}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-1">Period Selection</p>
        <p>
          By FY end: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?currentFY=2025-26&amp;comparisonFY=2024-25</code>
        </p>
        <p className="mt-1">
          Specific dates: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?currentDate=2026-06-30&amp;comparisonDate=2025-06-30</code>
        </p>
        <p className="mt-2 text-xs text-slate-400">Available FYs: {fyOptions.map((o) => o.label).join(", ")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Asset Movement</p>
          <p className={`mt-1 text-xl font-bold ${assetChange.dollarChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {assetChange.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(assetChange.dollarChange))}
          </p>
          <p className={`text-sm ${assetChange.pctChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {assetChange.pctChange >= 0 ? "+" : ""}{assetChange.pctChange.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Liability Movement</p>
          <p className={`mt-1 text-xl font-bold ${liabilityChange.dollarChange <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {liabilityChange.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(liabilityChange.dollarChange))}
          </p>
          <p className={`text-sm ${liabilityChange.pctChange <= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {liabilityChange.pctChange >= 0 ? "+" : ""}{liabilityChange.pctChange.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Equity Movement</p>
          <p className={`mt-1 text-xl font-bold ${equityChange.dollarChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {equityChange.dollarChange >= 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(equityChange.dollarChange))}
          </p>
          <p className={`text-sm ${equityChange.pctChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {equityChange.pctChange >= 0 ? "+" : ""}{equityChange.pctChange.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3 text-right">{currentLabel}</th>
              <th className="px-4 py-3 text-right">{comparisonLabel}</th>
              <th className="px-4 py-3 text-right">$ Change</th>
              <th className="px-4 py-3 text-right">% Change</th>
            </tr>
          </thead>
          <tbody>
            <SectionRows
              title="Assets"
              items={mergedAssets}
              totalCurrent={currentData.totalAssets}
              totalComparison={comparisonData.totalAssets}
              colorClass="text-blue-800"
              bgClass="bg-blue-50"
            />
            <tr><td colSpan={5} className="h-2" /></tr>
            <SectionRows
              title="Liabilities"
              items={mergedLiabilities}
              totalCurrent={currentData.totalLiabilities}
              totalComparison={comparisonData.totalLiabilities}
              colorClass="text-amber-800"
              bgClass="bg-amber-50"
            />
            <tr><td colSpan={5} className="h-2" /></tr>
            <SectionRows
              title="Equity"
              items={mergedEquity}
              totalCurrent={currentData.totalEquity}
              totalComparison={comparisonData.totalEquity}
              colorClass="text-violet-800"
              bgClass="bg-violet-50"
            />
            {/* Retained Earnings row */}
            <tr className="border-b border-slate-50 hover:bg-slate-50">
              <td className="py-2.5 pl-8 pr-4 text-sm italic text-slate-700">
                Retained Earnings
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-900">
                {formatCurrency(currentData.retainedEarnings)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-500">
                {formatCurrency(comparisonData.retainedEarnings)}
              </td>
              <ChangeCell
                dollarChange={currentData.retainedEarnings - comparisonData.retainedEarnings}
                pctChange={comparisonData.retainedEarnings !== 0
                  ? ((currentData.retainedEarnings - comparisonData.retainedEarnings) / Math.abs(comparisonData.retainedEarnings)) * 100
                  : currentData.retainedEarnings !== 0 ? 100 : 0}
              />
            </tr>
            <tr className="border-b-2 bg-violet-50">
              <td className="px-4 py-3 text-sm font-bold text-violet-800">Total Equity (incl. Retained Earnings)</td>
              <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-violet-800">
                {formatCurrency(currentData.totalEquity + currentData.retainedEarnings)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-violet-800">
                {formatCurrency(comparisonData.totalEquity + comparisonData.retainedEarnings)}
              </td>
              <ChangeCell dollarChange={equityChange.dollarChange} pctChange={equityChange.pctChange} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
