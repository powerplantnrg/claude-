import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function BankingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const params = await searchParams
  const filter = params.filter || "all"

  const where: any = { organizationId: orgId }
  if (filter === "reconciled") where.reconciled = true
  if (filter === "unreconciled") where.reconciled = false

  const transactions = await prisma.bankTransaction.findMany({
    where,
    include: {
      matchedJournal: {
        include: {
          lines: {
            include: { account: true },
            take: 3,
          },
        },
      },
    },
    orderBy: { date: "desc" },
  })

  const unmatchedJournals = await prisma.journalEntry.findMany({
    where: {
      organizationId: orgId,
      status: "Posted",
      bankTransaction: null,
    },
    include: {
      lines: { include: { account: true } },
    },
    orderBy: { date: "desc" },
    take: 50,
  })

  const totalTransactions = transactions.length
  const reconciledCount = transactions.filter((t) => t.reconciled).length
  const unreconciledCount = totalTransactions - reconciledCount
  const totalDeposits = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bank Reconciliation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Match bank transactions with journal entries
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalTransactions}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-600">Reconciled</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{reconciledCount}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-600">Unreconciled</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{unreconciledCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Deposits</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{formatCurrency(totalDeposits)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Withdrawals</p>
          <p className="mt-1 text-xl font-bold text-rose-700">{formatCurrency(totalWithdrawals)}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Reconciliation Progress</h3>
          <span className="text-sm text-slate-500">
            {totalTransactions > 0
              ? ((reconciledCount / totalTransactions) * 100).toFixed(1)
              : 0}% complete
          </span>
        </div>
        <div className="h-3 rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-indigo-600 transition-all"
            style={{
              width: `${totalTransactions > 0 ? (reconciledCount / totalTransactions) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { label: "All", value: "all" },
          { label: "Unreconciled", value: "unreconciled" },
          { label: "Reconciled", value: "reconciled" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={`/banking${tab.value === "all" ? "" : `?filter=${tab.value}`}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.value
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Matched To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    No bank transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-700">
                      {formatDate(tx.date)}
                    </td>
                    <td className="max-w-xs truncate px-6 py-3 text-sm font-medium text-slate-900">
                      {tx.description}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-500">
                      {tx.reference || "\u2014"}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-3 text-right font-mono text-sm font-medium tabular-nums ${tx.amount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {tx.amount >= 0 ? "" : "("}{formatCurrency(Math.abs(tx.amount))}{tx.amount < 0 ? ")" : ""}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      {tx.reconciled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          Reconciled
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          Unreconciled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">
                      {tx.matchedJournal ? (
                        <span className="text-xs text-indigo-600">
                          Journal #{tx.matchedJournal.entryNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unmatched Journals */}
      {unreconciledCount > 0 && unmatchedJournals.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Unmatched Journal Entries</h2>
            <p className="text-sm text-slate-500">
              Posted entries available for matching
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">Narration</th>
                  <th className="px-6 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unmatchedJournals.slice(0, 10).map((je) => (
                  <tr key={je.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-700">{formatDate(je.date)}</td>
                    <td className="px-6 py-3 text-sm font-mono text-slate-500">{je.entryNumber}</td>
                    <td className="max-w-xs truncate px-6 py-3 text-sm text-slate-900">{je.narration}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{je.reference || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
