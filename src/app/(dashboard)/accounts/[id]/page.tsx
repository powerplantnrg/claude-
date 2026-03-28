import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

const TYPE_COLORS: Record<string, string> = {
  Asset: "bg-blue-50 text-blue-700 border-blue-200",
  Liability: "bg-amber-50 text-amber-700 border-amber-200",
  Equity: "bg-purple-50 text-purple-700 border-purple-200",
  Revenue: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Expense: "bg-rose-50 text-rose-700 border-rose-200",
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id } = await params

  const account = await prisma.account.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!account) notFound()

  // Fetch journal lines for this account, most recent first
  const journalLines = await prisma.journalLine.findMany({
    where: { accountId: account.id },
    include: {
      journalEntry: {
        select: {
          id: true,
          entryNumber: true,
          date: true,
          narration: true,
          reference: true,
          status: true,
        },
      },
    },
    orderBy: {
      journalEntry: { date: "desc" },
    },
    take: 100,
  })

  // Calculate totals
  const totalDebits = journalLines.reduce((sum, jl) => sum + jl.debit, 0)
  const totalCredits = journalLines.reduce((sum, jl) => sum + jl.credit, 0)
  const netBalance = totalDebits - totalCredits

  // Compute running balance (oldest to newest for cumulative, display newest first)
  const sortedByDateAsc = [...journalLines].reverse()
  const runningBalances = new Map<string, number>()
  let running = 0
  for (const jl of sortedByDateAsc) {
    running += jl.debit - jl.credit
    runningBalances.set(jl.id, running)
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/accounts" className="hover:text-indigo-600">Chart of Accounts</Link>
        <span>/</span>
        <span className="text-slate-700">{account.code} - {account.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{account.name}</h1>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[account.type] || "bg-slate-100 text-slate-700"}`}>
              {account.type}
            </span>
            {account.isRdEligible && (
              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                R&D Eligible
              </span>
            )}
            {!account.isActive && (
              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 font-mono">{account.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/accounts/${id}/edit`}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Edit
          </Link>
          <Link
            href={`/accounts/${id}/reconciliation`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Reconciliation
          </Link>
          <Link
            href="/accounts"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Back to Accounts
          </Link>
        </div>
      </div>

      {/* Account Info */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Account Details</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <p className="text-xs font-medium text-slate-500">Code</p>
            <p className="text-sm font-mono text-slate-900">{account.code}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Name</p>
            <p className="text-sm text-slate-900">{account.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Type</p>
            <p className="text-sm text-slate-900">{account.type}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Sub-Type</p>
            <p className="text-sm text-slate-900">{account.subType || "\u2014"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Tax Type</p>
            <p className="text-sm text-slate-900">{account.taxType || "\u2014"}</p>
          </div>
        </div>
        {account.description && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500">Description</p>
            <p className="mt-1 text-sm text-slate-700">{account.description}</p>
          </div>
        )}
      </div>

      {/* Summary Totals */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total Debits</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalDebits)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total Credits</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalCredits)}</p>
        </div>
        <div className={`rounded-xl border p-5 ${netBalance >= 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
          <p className={`text-sm font-medium ${netBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            Net Balance
          </p>
          <p className={`mt-1 text-xl font-bold ${netBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {netBalance < 0 ? "-" : ""}{formatCurrency(Math.abs(netBalance))}
          </p>
        </div>
      </div>

      {/* Journal Lines */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent Journal Lines
            <span className="ml-2 font-normal text-slate-400">({journalLines.length})</span>
          </h2>
        </div>
        {journalLines.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No journal entries for this account yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Entry #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Narration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Running Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {journalLines.map((jl) => {
                  const rb = runningBalances.get(jl.id) ?? 0
                  return (
                    <tr key={jl.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {formatDate(jl.journalEntry.date)}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-900">
                        JE-{jl.journalEntry.entryNumber}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 max-w-xs truncate">
                        {jl.description || jl.journalEntry.narration}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {jl.journalEntry.reference || "\u2014"}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-900">
                        {jl.debit > 0 ? `$${fmt(jl.debit)}` : ""}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-900">
                        {jl.credit > 0 ? `$${fmt(jl.credit)}` : ""}
                      </td>
                      <td className={`px-6 py-3 text-right font-mono text-sm font-medium tabular-nums ${rb >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                        {rb < 0 ? "-" : ""}${fmt(Math.abs(rb))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
