import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default async function AccountReconciliationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id } = await params
  const { from, to } = await searchParams

  const account = await prisma.account.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!account) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Account not found.
        </div>
        <Link href="/accounts" className="text-sm text-indigo-600 hover:text-indigo-700">
          Back to Accounts
        </Link>
      </div>
    )
  }

  // Build date filter
  const dateFilter: Record<string, unknown> = {}
  if (from && typeof from === "string") {
    dateFilter.gte = new Date(from)
  }
  if (to && typeof to === "string") {
    dateFilter.lte = new Date(to + "T23:59:59.999Z")
  }

  const journalLineWhere: Record<string, unknown> = {
    accountId: id,
    journalEntry: {
      organizationId: orgId,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    },
  }

  const journalLines = await prisma.journalLine.findMany({
    where: journalLineWhere,
    include: {
      journalEntry: {
        select: {
          id: true,
          entryNumber: true,
          date: true,
          reference: true,
          narration: true,
          status: true,
        },
      },
    },
    orderBy: {
      journalEntry: {
        date: "asc",
      },
    },
  })

  // Calculate running balance and totals
  let runningBalance = 0
  const totalDebits = journalLines.reduce((sum, line) => sum + line.debit, 0)
  const totalCredits = journalLines.reduce((sum, line) => sum + line.credit, 0)

  // For balance-sheet accounts (Asset, Liability, Equity), debits increase assets and decrease liabilities/equity
  // For income statement (Revenue, Expense), similar logic
  const isDebitNormal = account.type === "Asset" || account.type === "Expense"

  // Calculate opening balance (lines before the 'from' date)
  let openingBalance = 0
  if (from && typeof from === "string") {
    const priorLines = await prisma.journalLine.findMany({
      where: {
        accountId: id,
        journalEntry: {
          organizationId: orgId,
          date: { lt: new Date(from) },
        },
      },
    })
    for (const line of priorLines) {
      if (isDebitNormal) {
        openingBalance += line.debit - line.credit
      } else {
        openingBalance += line.credit - line.debit
      }
    }
  }

  runningBalance = openingBalance

  const linesWithBalance = journalLines.map((line) => {
    if (isDebitNormal) {
      runningBalance += line.debit - line.credit
    } else {
      runningBalance += line.credit - line.debit
    }
    return {
      ...line,
      runningBalance,
    }
  })

  const closingBalance = runningBalance

  const fromValue = typeof from === "string" ? from : ""
  const toValue = typeof to === "string" ? to : ""

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Accounts
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Account Reconciliation
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-mono font-medium">{account.code}</span> &mdash; {account.name} ({account.type})
        </p>
      </div>

      {/* Date Filter */}
      <form className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label htmlFor="from" className="block text-xs font-medium text-slate-600">
            From Date
          </label>
          <input
            id="from"
            type="date"
            name="from"
            defaultValue={fromValue}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs font-medium text-slate-600">
            To Date
          </label>
          <input
            id="to"
            type="date"
            name="to"
            defaultValue={toValue}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Filter
        </button>
        {(fromValue || toValue) && (
          <Link
            href={`/accounts/${id}/reconciliation`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Opening Balance
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatCurrency(openingBalance)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Debits
          </p>
          <p className="mt-1 text-lg font-semibold text-blue-700">
            {formatCurrency(totalDebits)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Credits
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-700">
            {formatCurrency(totalCredits)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Closing Balance
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatCurrency(closingBalance)}
          </p>
        </div>
      </div>

      {/* Journal Lines Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Journal Lines
            <span className="ml-2 font-normal text-slate-500">
              ({linesWithBalance.length})
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Entry #</th>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Debit</th>
                <th className="px-6 py-3 text-right">Credit</th>
                <th className="px-6 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {openingBalance !== 0 && (
                <tr className="bg-slate-50">
                  <td colSpan={5} className="px-6 py-2 text-sm font-medium text-slate-600">
                    Opening Balance
                  </td>
                  <td className="px-6 py-2 text-right text-sm text-slate-500">&mdash;</td>
                  <td className="px-6 py-2 text-right text-sm text-slate-500">&mdash;</td>
                  <td className="px-6 py-2 text-right text-sm font-medium text-slate-900">
                    {formatCurrency(openingBalance)}
                  </td>
                </tr>
              )}
              {linesWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">
                    No journal lines found for this account.
                  </td>
                </tr>
              ) : (
                linesWithBalance.map((line) => {
                  const isDraft = line.journalEntry.status === "Draft"
                  return (
                    <tr
                      key={line.id}
                      className={`transition-colors hover:bg-slate-50 ${
                        isDraft ? "bg-amber-50/50" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-700">
                        {formatDate(line.journalEntry.date)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm font-mono text-slate-600">
                        {line.journalEntry.entryNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-500">
                        {line.journalEntry.reference || "\u2014"}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {line.description || line.journalEntry.narration}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm">
                        {isDraft ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Posted
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right text-sm font-mono text-slate-700">
                        {line.debit > 0 ? formatCurrency(line.debit) : "\u2014"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right text-sm font-mono text-slate-700">
                        {line.credit > 0 ? formatCurrency(line.credit) : "\u2014"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right text-sm font-mono font-medium text-slate-900">
                        {formatCurrency(line.runningBalance)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
