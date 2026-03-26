import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { AccountsTable } from "@/components/tables/accounts-table"

const ACCOUNT_TYPE_ORDER = ["Asset", "Liability", "Equity", "Revenue", "Expense"]

const TYPE_COLORS: Record<string, { badge: string; header: string }> = {
  Asset: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    header: "bg-blue-50 border-blue-200 text-blue-800",
  },
  Liability: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    header: "bg-amber-50 border-amber-200 text-amber-800",
  },
  Equity: {
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    header: "bg-purple-50 border-purple-200 text-purple-800",
  },
  Revenue: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    header: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  Expense: {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    header: "bg-rose-50 border-rose-200 text-rose-800",
  },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(amount)
}

export default async function AccountsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const accounts = await prisma.account.findMany({
    where: { organizationId: orgId },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  })

  // Compute account type balances from journal lines
  const journalLineSums = await prisma.journalLine.groupBy({
    by: ["accountId"],
    _sum: {
      debit: true,
      credit: true,
    },
    where: {
      account: {
        organizationId: orgId,
      },
    },
  })

  // Build a map of accountId -> { debit, credit }
  const balanceMap = new Map<string, { debit: number; credit: number }>()
  for (const line of journalLineSums) {
    balanceMap.set(line.accountId, {
      debit: line._sum.debit ?? 0,
      credit: line._sum.credit ?? 0,
    })
  }

  // For YTD (Revenue/Expense), compute from current financial year
  // Australian FY: July 1 - June 30
  const now = new Date()
  const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  const fyStart = new Date(fyStartYear, 6, 1)

  const ytdJournalLineSums = await prisma.journalLine.groupBy({
    by: ["accountId"],
    _sum: {
      debit: true,
      credit: true,
    },
    where: {
      account: {
        organizationId: orgId,
        type: { in: ["Revenue", "Expense"] },
      },
      journalEntry: {
        date: { gte: fyStart },
      },
    },
  })

  const ytdBalanceMap = new Map<string, { debit: number; credit: number }>()
  for (const line of ytdJournalLineSums) {
    ytdBalanceMap.set(line.accountId, {
      debit: line._sum.debit ?? 0,
      credit: line._sum.credit ?? 0,
    })
  }

  // Calculate type totals
  // Assets: debit-normal (balance = debits - credits)
  // Liabilities: credit-normal (balance = credits - debits)
  // Equity: credit-normal (balance = credits - debits)
  // Revenue: credit-normal YTD (balance = credits - debits)
  // Expense: debit-normal YTD (balance = debits - credits)
  const typeTotals: Record<string, number> = {
    Asset: 0,
    Liability: 0,
    Equity: 0,
    Revenue: 0,
    Expense: 0,
  }

  for (const account of accounts) {
    if (account.type === "Revenue" || account.type === "Expense") {
      const bal = ytdBalanceMap.get(account.id)
      if (bal) {
        if (account.type === "Expense") {
          typeTotals.Expense += bal.debit - bal.credit
        } else {
          typeTotals.Revenue += bal.credit - bal.debit
        }
      }
    } else {
      const bal = balanceMap.get(account.id)
      if (bal) {
        if (account.type === "Asset") {
          typeTotals.Asset += bal.debit - bal.credit
        } else {
          typeTotals[account.type] += bal.credit - bal.debit
        }
      }
    }
  }

  const summaryCards = [
    { label: "Total Assets", value: typeTotals.Asset, color: "text-blue-700", border: "border-blue-200" },
    { label: "Total Liabilities", value: typeTotals.Liability, color: "text-amber-700", border: "border-amber-200" },
    { label: "Total Equity", value: typeTotals.Equity, color: "text-purple-700", border: "border-purple-200" },
    { label: "Revenue (YTD)", value: typeTotals.Revenue, color: "text-emerald-700", border: "border-emerald-200" },
    { label: "Expenses (YTD)", value: typeTotals.Expense, color: "text-rose-700", border: "border-rose-200" },
  ]

  const grouped = ACCOUNT_TYPE_ORDER.reduce(
    (acc, type) => {
      acc[type] = accounts.filter((a) => a.type === type)
      return acc
    },
    {} as Record<string, typeof accounts>
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Chart of Accounts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your organization&apos;s accounts across all categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/accounts/import"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Import CSV
          </Link>
          <Link
            href="/accounts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Account
          </Link>
        </div>
      </div>

      {/* Account Type Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border bg-white p-4 shadow-sm ${card.border}`}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className={`mt-1 text-lg font-semibold ${card.color}`}>
              {formatCurrency(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Summary Bar */}
      <div className="flex flex-wrap gap-3">
        {ACCOUNT_TYPE_ORDER.map((type) => {
          const colors = TYPE_COLORS[type] ?? { badge: "", header: "" }
          return (
            <div
              key={type}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${colors.badge}`}
            >
              {type}
              <span className="font-bold">{grouped[type]?.length ?? 0}</span>
            </div>
          )
        })}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          Total
          <span className="font-bold">{accounts.length}</span>
        </div>
      </div>

      {/* Account Groups */}
      {ACCOUNT_TYPE_ORDER.map((type) => {
        const typeAccounts = grouped[type] ?? []
        const colors = TYPE_COLORS[type] ?? { badge: "", header: "" }

        if (typeAccounts.length === 0) return null

        const tableData = typeAccounts.map((account) => ({
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          subType: account.subType,
          taxType: account.taxType,
          isActive: account.isActive,
          isRdEligible: account.isRdEligible,
        }))

        return (
          <div
            key={type}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div
              className={`border-b px-6 py-3 ${colors.header}`}
            >
              <h2 className="text-sm font-semibold">
                {type} Accounts
                <span className="ml-2 font-normal opacity-70">
                  ({typeAccounts.length})
                </span>
              </h2>
            </div>
            <AccountsTable accounts={tableData} />
          </div>
        )
      })}

      {accounts.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">
            No accounts yet
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Get started by creating your first account or importing from CSV.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/accounts/new"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              New Account
            </Link>
            <Link
              href="/accounts/import"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Import CSV
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
