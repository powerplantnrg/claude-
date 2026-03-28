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

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; fy?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const params = await searchParams
  const fyDates = getFinancialYearDates(params.fy)
  const startDate = params.from ? new Date(params.from) : fyDates.start
  const endDate = params.to ? new Date(params.to) : fyDates.end

  const formatStart = startDate.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })
  const formatEnd = endDate.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })

  // Fetch posted journal lines involving bank/cash accounts (Asset subtype "Bank" or "Cash")
  // We identify bank accounts by subType or by name containing "Bank" or "Cash"
  const bankAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      type: "Asset",
      OR: [
        { subType: { in: ["Bank", "Cash"] } },
        { name: { contains: "Bank" } },
        { name: { contains: "Cash" } },
      ],
    },
  })

  const bankAccountIds = bankAccounts.map((a) => a.id)

  // Fetch all journal lines that touch bank accounts within the period
  const bankJournalLines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: bankAccountIds },
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: startDate, lte: endDate },
      },
    },
    include: {
      journalEntry: {
        include: {
          lines: {
            include: { account: true },
          },
        },
      },
    },
  })

  // Classify cash movements by the counterpart account type
  type CashFlowItem = {
    description: string
    amount: number
  }

  const operating: CashFlowItem[] = []
  const investing: CashFlowItem[] = []
  const financing: CashFlowItem[] = []

  // Track processed journal entries to avoid double-counting
  const processedEntries = new Set<string>()

  for (const bankLine of bankJournalLines) {
    const entry = bankLine.journalEntry
    if (processedEntries.has(entry.id)) continue
    processedEntries.add(entry.id)

    // Net cash effect: debits to bank = cash in, credits to bank = cash out
    const cashEffect = entry.lines
      .filter((l) => bankAccountIds.includes(l.accountId))
      .reduce((sum, l) => sum + l.debit - l.credit, 0)

    if (Math.abs(cashEffect) < 0.01) continue

    // Determine category from counterpart accounts
    const counterpartTypes = entry.lines
      .filter((l) => !bankAccountIds.includes(l.accountId))
      .map((l) => l.account.type)

    const counterpartSubTypes = entry.lines
      .filter((l) => !bankAccountIds.includes(l.accountId))
      .map((l) => l.account.subType || "")

    const item: CashFlowItem = {
      description: entry.narration || entry.reference || `Journal #${entry.entryNumber}`,
      amount: cashEffect,
    }

    // Classify: Investing if counterpart is fixed asset / non-current asset
    const isInvesting = counterpartSubTypes.some((st) =>
      ["FixedAsset", "NonCurrentAsset", "Investment", "Equipment", "Property"].includes(st)
    )
    // Financing if counterpart is liability (loan) or equity
    const isFinancing =
      counterpartTypes.includes("Equity") ||
      counterpartSubTypes.some((st) =>
        ["Loan", "LongTermLiability", "ShareCapital", "Drawings"].includes(st)
      )

    if (isInvesting) {
      investing.push(item)
    } else if (isFinancing) {
      financing.push(item)
    } else {
      operating.push(item)
    }
  }

  const totalOperating = operating.reduce((sum, i) => sum + i.amount, 0)
  const totalInvesting = investing.reduce((sum, i) => sum + i.amount, 0)
  const totalFinancing = financing.reduce((sum, i) => sum + i.amount, 0)
  const netCashFlow = totalOperating + totalInvesting + totalFinancing

  // Opening and closing bank balances
  const openingLines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: bankAccountIds },
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { lt: startDate },
      },
    },
  })
  const openingBalance = openingLines.reduce((sum, l) => sum + l.debit - l.credit, 0)
  const closingBalance = openingBalance + netCashFlow

  function renderSection(
    title: string,
    items: CashFlowItem[],
    total: number,
    bgClass: string,
    borderClass: string,
    textClass: string
  ) {
    return (
      <>
        <tr className={`border-b border-slate-200 ${bgClass}`}>
          <td colSpan={2} className={`px-6 py-3 text-sm font-bold ${textClass}`}>
            {title}
          </td>
        </tr>
        {items.length === 0 && (
          <tr>
            <td colSpan={2} className="px-6 py-3 text-sm text-slate-400 italic">
              No transactions
            </td>
          </tr>
        )}
        {items.map((item, idx) => (
          <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
            <td className="px-6 py-2.5 text-sm text-slate-700 pl-10">{item.description}</td>
            <td className={`px-6 py-2.5 text-sm text-right font-mono tabular-nums ${item.amount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {item.amount >= 0 ? "" : "("}{formatCurrency(Math.abs(item.amount))}{item.amount < 0 ? ")" : ""}
            </td>
          </tr>
        ))}
        <tr className={`border-b-2 ${borderClass} ${bgClass}/50`}>
          <td className={`px-6 py-3 text-sm font-bold ${textClass}`}>
            Net {title}
          </td>
          <td className={`px-6 py-3 text-sm text-right font-mono font-bold tabular-nums ${total >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {total >= 0 ? "" : "("}{formatCurrency(Math.abs(total))}{total < 0 ? ")" : ""}
          </td>
        </tr>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Cash Flow Statement</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatStart} &mdash; {formatEnd} ({fyDates.label})
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Filter by date range: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?from=2025-07-01&amp;to=2026-06-30</code> or financial year: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?fy=2026</code>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance */}
            <tr className="border-b border-slate-200 bg-slate-100">
              <td className="px-6 py-3 text-sm font-semibold text-slate-700">Opening Cash Balance</td>
              <td className="px-6 py-3 text-sm text-right font-mono font-semibold tabular-nums text-slate-900">
                {formatCurrency(openingBalance)}
              </td>
            </tr>

            <tr><td colSpan={2} className="h-2"></td></tr>

            {renderSection("Operating Activities", operating, totalOperating, "bg-blue-50", "border-blue-200", "text-blue-800")}

            <tr><td colSpan={2} className="h-2"></td></tr>

            {renderSection("Investing Activities", investing, totalInvesting, "bg-amber-50", "border-amber-200", "text-amber-800")}

            <tr><td colSpan={2} className="h-2"></td></tr>

            {renderSection("Financing Activities", financing, totalFinancing, "bg-violet-50", "border-violet-200", "text-violet-800")}

            <tr><td colSpan={2} className="h-2"></td></tr>

            {/* Net Cash Flow */}
            <tr className={`border-t-2 ${netCashFlow >= 0 ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
              <td className="px-6 py-3 text-sm font-bold text-slate-900">Net Cash Flow</td>
              <td className={`px-6 py-3 text-sm text-right font-mono font-bold tabular-nums ${netCashFlow >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {netCashFlow >= 0 ? "" : "("}{formatCurrency(Math.abs(netCashFlow))}{netCashFlow < 0 ? ")" : ""}
              </td>
            </tr>

            {/* Closing Balance */}
            <tr className="border-t-2 border-slate-300 bg-slate-100">
              <td className="px-6 py-4 text-base font-bold text-slate-900">Closing Cash Balance</td>
              <td className="px-6 py-4 text-base text-right font-mono font-bold tabular-nums text-slate-900">
                {formatCurrency(closingBalance)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
