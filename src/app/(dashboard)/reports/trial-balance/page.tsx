import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { TrialBalanceExportButton } from "./export-button"

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
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
    },
    include: { account: true },
  })

  type TrialBalanceRow = {
    account: typeof journalLines[0]["account"]
    totalDebit: number
    totalCredit: number
  }

  const balances = new Map<string, TrialBalanceRow>()

  for (const line of journalLines) {
    const existing = balances.get(line.accountId)
    if (existing) {
      existing.totalDebit += line.debit
      existing.totalCredit += line.credit
    } else {
      balances.set(line.accountId, {
        account: line.account,
        totalDebit: line.debit,
        totalCredit: line.credit,
      })
    }
  }

  const rows = Array.from(balances.values()).sort((a, b) =>
    a.account.code.localeCompare(b.account.code)
  )

  const grandTotalDebit = rows.reduce((sum, r) => sum + r.totalDebit, 0)
  const grandTotalCredit = rows.reduce((sum, r) => sum + r.totalCredit, 0)
  const isBalanced = Math.abs(grandTotalDebit - grandTotalCredit) < 0.01

  const formatAsOf = asOfDate.toLocaleDateString("en-AU", {
    day: "2-digit", month: "short", year: "numeric",
  })

  const typeColors: Record<string, string> = {
    Asset: "text-blue-600",
    Liability: "text-amber-600",
    Equity: "text-violet-600",
    Revenue: "text-emerald-600",
    Expense: "text-rose-600",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Trial Balance</h1>
          <p className="mt-1 text-sm text-slate-500">As of {formatAsOf}</p>
        </div>
        <TrialBalanceExportButton
          rows={rows.map((row) => ({
            code: row.account.code,
            name: row.account.name,
            type: row.account.type,
            totalDebit: row.totalDebit,
            totalCredit: row.totalCredit,
          }))}
          grandTotalDebit={grandTotalDebit}
          grandTotalCredit={grandTotalCredit}
          asOfDate={formatAsOf}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        View as of a specific date:{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?date=2026-06-30</code>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Account Name</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3 text-right">Debit</th>
              <th className="px-6 py-3 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                  No posted journal entries found
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.account.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-2.5 font-mono text-sm text-slate-500">{row.account.code}</td>
                  <td className="px-6 py-2.5 text-sm font-medium text-slate-900">{row.account.name}</td>
                  <td className="px-6 py-2.5">
                    <span className={`text-xs font-medium ${typeColors[row.account.type] || "text-slate-500"}`}>
                      {row.account.type}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 text-right font-mono text-sm tabular-nums text-slate-900">
                    {row.totalDebit > 0 ? formatCurrency(row.totalDebit) : "\u2014"}
                  </td>
                  <td className="px-6 py-2.5 text-right font-mono text-sm tabular-nums text-slate-900">
                    {row.totalCredit > 0 ? formatCurrency(row.totalCredit) : "\u2014"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className={`border-t-2 ${isBalanced ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
              <td colSpan={3} className="px-6 py-4 text-sm font-bold text-slate-900">
                Grand Total
                {isBalanced ? (
                  <span className="ml-2 text-xs font-normal text-emerald-600">Balanced</span>
                ) : (
                  <span className="ml-2 text-xs font-normal text-rose-600">
                    Out of balance by {formatCurrency(Math.abs(grandTotalDebit - grandTotalCredit))}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                {formatCurrency(grandTotalDebit)}
              </td>
              <td className="px-6 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                {formatCurrency(grandTotalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
