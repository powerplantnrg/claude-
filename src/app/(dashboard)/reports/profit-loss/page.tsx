import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

function getFinancialYearDates(year?: string): { start: Date; end: Date; label: string } {
  const now = new Date()
  if (year) {
    const fy = parseInt(year, 10)
    return {
      start: new Date(fy - 1, 6, 1), // July 1 of previous year
      end: new Date(fy, 5, 30, 23, 59, 59), // June 30 of FY year
      label: `FY ${fy - 1}/${fy}`,
    }
  }
  // Default: current financial year
  const fyEnd = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  return {
    start: new Date(fyEnd - 1, 6, 1),
    end: new Date(fyEnd, 5, 30, 23, 59, 59),
    label: `FY ${fyEnd - 1}/${fyEnd}`,
  }
}

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; fy?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const params = await searchParams
  const fyDates = getFinancialYearDates(params.fy)
  const startDate = params.from ? new Date(params.from) : fyDates.start
  const endDate = params.to ? new Date(params.to) : fyDates.end

  // Fetch posted journal lines with their accounts for this period
  const journalLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: startDate, lte: endDate },
      },
      account: {
        type: { in: ["Revenue", "Expense"] },
      },
    },
    include: {
      account: true,
    },
  })

  // Group by account type and then by account
  const revenueAccounts = new Map<string, { account: typeof journalLines[0]["account"]; total: number }>()
  const expenseAccounts = new Map<string, { account: typeof journalLines[0]["account"]; total: number; subType: string }>()

  for (const line of journalLines) {
    if (line.account.type === "Revenue") {
      const existing = revenueAccounts.get(line.accountId)
      // Revenue: credits - debits
      const amount = line.credit - line.debit
      if (existing) {
        existing.total += amount
      } else {
        revenueAccounts.set(line.accountId, { account: line.account, total: amount })
      }
    } else if (line.account.type === "Expense") {
      const existing = expenseAccounts.get(line.accountId)
      // Expenses: debits - credits
      const amount = line.debit - line.credit
      if (existing) {
        existing.total += amount
      } else {
        expenseAccounts.set(line.accountId, {
          account: line.account,
          total: amount,
          subType: line.account.subType || "Other",
        })
      }
    }
  }

  const revenueItems = Array.from(revenueAccounts.values()).sort(
    (a, b) => a.account.code.localeCompare(b.account.code)
  )
  const totalRevenue = revenueItems.reduce((sum, item) => sum + item.total, 0)

  // Group expenses by subType
  const expenseItems = Array.from(expenseAccounts.values()).sort(
    (a, b) => a.account.code.localeCompare(b.account.code)
  )
  const expensesBySubType = new Map<string, typeof expenseItems>()
  for (const item of expenseItems) {
    const group = expensesBySubType.get(item.subType) || []
    group.push(item)
    expensesBySubType.set(item.subType, group)
  }
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.total, 0)
  const netProfitLoss = totalRevenue - totalExpenses

  const formatStart = startDate.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })
  const formatEnd = endDate.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Profit &amp; Loss Statement</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatStart} &mdash; {formatEnd} ({fyDates.label})
          </p>
        </div>
      </div>

      {/* Date range filter hint */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Filter by date range using URL parameters: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?from=2025-07-01&amp;to=2026-06-30</code> or by financial year: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?fy=2026</code>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Account</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* Revenue Section */}
            <tr className="border-b border-slate-200 bg-emerald-50">
              <td colSpan={2} className="px-6 py-3 text-sm font-bold text-emerald-800">
                Revenue
              </td>
            </tr>
            {revenueItems.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-3 text-sm text-slate-400 italic">No revenue entries</td>
              </tr>
            )}
            {revenueItems.map((item) => (
              <tr key={item.account.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-6 py-2.5 text-sm text-slate-700">
                  <span className="font-mono text-xs text-slate-400 mr-2">{item.account.code}</span>
                  {item.account.name}
                </td>
                <td className="px-6 py-2.5 text-sm text-right font-mono tabular-nums text-slate-900">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
            <tr className="border-b-2 border-emerald-200 bg-emerald-50/50">
              <td className="px-6 py-3 text-sm font-bold text-emerald-900">Total Revenue</td>
              <td className="px-6 py-3 text-sm text-right font-mono font-bold tabular-nums text-emerald-900">
                {formatCurrency(totalRevenue)}
              </td>
            </tr>

            {/* Spacer */}
            <tr><td colSpan={2} className="h-2"></td></tr>

            {/* Expenses Section */}
            <tr className="border-b border-slate-200 bg-rose-50">
              <td colSpan={2} className="px-6 py-3 text-sm font-bold text-rose-800">
                Expenses
              </td>
            </tr>
            {expenseItems.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-3 text-sm text-slate-400 italic">No expense entries</td>
              </tr>
            )}
            {Array.from(expensesBySubType.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([subType, items]) => (
                <tbody key={subType}>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <td colSpan={2} className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {subType}
                    </td>
                  </tr>
                  {items.map((item) => (
                    <tr key={item.account.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-6 py-2.5 text-sm text-slate-700 pl-10">
                        <span className="font-mono text-xs text-slate-400 mr-2">{item.account.code}</span>
                        {item.account.name}
                      </td>
                      <td className="px-6 py-2.5 text-sm text-right font-mono tabular-nums text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            <tr className="border-b-2 border-rose-200 bg-rose-50/50">
              <td className="px-6 py-3 text-sm font-bold text-rose-900">Total Expenses</td>
              <td className="px-6 py-3 text-sm text-right font-mono font-bold tabular-nums text-rose-900">
                {formatCurrency(totalExpenses)}
              </td>
            </tr>

            {/* Spacer */}
            <tr><td colSpan={2} className="h-2"></td></tr>

            {/* Net Profit/Loss */}
            <tr className={`border-t-2 ${netProfitLoss >= 0 ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
              <td className="px-6 py-4 text-base font-bold text-slate-900">
                {netProfitLoss >= 0 ? "Net Profit" : "Net Loss"}
              </td>
              <td className={`px-6 py-4 text-base text-right font-mono font-bold tabular-nums ${netProfitLoss >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {formatCurrency(Math.abs(netProfitLoss))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
