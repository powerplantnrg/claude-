import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const params = await searchParams
  const asOfDate = params.date ? new Date(params.date) : new Date()

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

  type AccountBalance = { account: typeof journalLines[0]["account"]; balance: number }
  const accountBalances = new Map<string, AccountBalance>()

  for (const line of journalLines) {
    const existing = accountBalances.get(line.accountId)
    const netAmount = line.account.type === "Asset"
      ? line.debit - line.credit
      : line.credit - line.debit
    if (existing) {
      existing.balance += netAmount
    } else {
      accountBalances.set(line.accountId, { account: line.account, balance: netAmount })
    }
  }

  const assets = Array.from(accountBalances.values())
    .filter((a) => a.account.type === "Asset")
    .sort((a, b) => a.account.code.localeCompare(b.account.code))
  const liabilities = Array.from(accountBalances.values())
    .filter((a) => a.account.type === "Liability")
    .sort((a, b) => a.account.code.localeCompare(b.account.code))
  const equity = Array.from(accountBalances.values())
    .filter((a) => a.account.type === "Equity")
    .sort((a, b) => a.account.code.localeCompare(b.account.code))

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0)
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0)
  const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0)

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

  const totalEquityWithRetained = totalEquity + retainedEarnings
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquityWithRetained
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01

  const formatAsOf = asOfDate.toLocaleDateString("en-AU", {
    day: "2-digit", month: "short", year: "numeric",
  })

  function AccountSection({
    title, items, total, colorClass, bgClass,
  }: {
    title: string; items: AccountBalance[]; total: number; colorClass: string; bgClass: string
  }) {
    return (
      <>
        <tr className={`border-b border-slate-200 ${bgClass}`}>
          <td colSpan={2} className={`px-6 py-3 text-sm font-bold ${colorClass}`}>{title}</td>
        </tr>
        {items.length === 0 ? (
          <tr>
            <td colSpan={2} className="px-6 py-3 text-sm italic text-slate-400">No {title.toLowerCase()} accounts</td>
          </tr>
        ) : (
          items.map((item) => (
            <tr key={item.account.id} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="px-6 py-2.5 text-sm text-slate-700">
                <span className="mr-2 font-mono text-xs text-slate-400">{item.account.code}</span>
                {item.account.name}
              </td>
              <td className="px-6 py-2.5 text-right font-mono text-sm tabular-nums text-slate-900">
                {formatCurrency(item.balance)}
              </td>
            </tr>
          ))
        )}
        <tr className={`border-b-2 ${bgClass}`}>
          <td className={`px-6 py-3 text-sm font-bold ${colorClass}`}>Total {title}</td>
          <td className={`px-6 py-3 text-right font-mono text-sm font-bold tabular-nums ${colorClass}`}>
            {formatCurrency(total)}
          </td>
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
        <h1 className="text-2xl font-semibold text-slate-900">Balance Sheet</h1>
        <p className="mt-1 text-sm text-slate-500">As of {formatAsOf}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        View as of a specific date:{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?date=2026-06-30</code>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Account</th>
              <th className="px-6 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <AccountSection title="Assets" items={assets} total={totalAssets} colorClass="text-blue-800" bgClass="bg-blue-50" />
            <tr><td colSpan={2} className="h-2" /></tr>
            <AccountSection title="Liabilities" items={liabilities} total={totalLiabilities} colorClass="text-amber-800" bgClass="bg-amber-50" />
            <tr><td colSpan={2} className="h-2" /></tr>
            <AccountSection title="Equity" items={equity} total={totalEquity} colorClass="text-violet-800" bgClass="bg-violet-50" />

            <tr className="border-b border-slate-50 hover:bg-slate-50">
              <td className="py-2.5 pl-10 pr-6 text-sm italic text-slate-700">
                Retained Earnings (Current Period)
              </td>
              <td className="px-6 py-2.5 text-right font-mono text-sm tabular-nums text-slate-900">
                {formatCurrency(retainedEarnings)}
              </td>
            </tr>
            <tr className="border-b-2 bg-violet-50">
              <td className="px-6 py-3 text-sm font-bold text-violet-800">Total Equity (incl. Retained Earnings)</td>
              <td className="px-6 py-3 text-right font-mono text-sm font-bold tabular-nums text-violet-800">
                {formatCurrency(totalEquityWithRetained)}
              </td>
            </tr>

            <tr><td colSpan={2} className="h-2" /></tr>

            <tr className={`border-t-2 ${isBalanced ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
              <td className="px-6 py-4 text-base font-bold text-slate-900">
                Total Liabilities &amp; Equity
              </td>
              <td className={`px-6 py-4 text-right font-mono text-base font-bold tabular-nums ${isBalanced ? "text-emerald-700" : "text-rose-700"}`}>
                {formatCurrency(totalLiabilitiesAndEquity)}
              </td>
            </tr>

            {!isBalanced && (
              <tr className="bg-rose-50">
                <td colSpan={2} className="px-6 py-2 text-center text-sm font-medium text-rose-600">
                  Warning: Balance sheet is out of balance by {formatCurrency(Math.abs(totalAssets - totalLiabilitiesAndEquity))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
