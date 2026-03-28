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

// Australian BAS quarters based on financial year (July-June)
function getQuarters(fyStart: Date, fyEnd: Date) {
  const year = fyStart.getFullYear()
  return [
    { label: "Q1 (Jul-Sep)", start: new Date(year, 6, 1), end: new Date(year, 8, 30, 23, 59, 59) },
    { label: "Q2 (Oct-Dec)", start: new Date(year, 9, 1), end: new Date(year, 11, 31, 23, 59, 59) },
    { label: "Q3 (Jan-Mar)", start: new Date(year + 1, 0, 1), end: new Date(year + 1, 2, 31, 23, 59, 59) },
    { label: "Q4 (Apr-Jun)", start: new Date(year + 1, 3, 1), end: new Date(year + 1, 5, 30, 23, 59, 59) },
  ]
}

export default async function GSTReportPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const params = await searchParams
  const fyDates = getFinancialYearDates(params.fy)
  const quarters = getQuarters(fyDates.start, fyDates.end)

  // Fetch GST accounts - GST Collected (Liability) and GST Paid (Asset)
  const gstCollectedAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: { contains: "GST Collected" } },
        { name: { contains: "GST on Sales" } },
        { taxType: "GSTCollected" },
        { subType: "GSTCollected" },
      ],
    },
  })

  const gstPaidAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: { contains: "GST Paid" } },
        { name: { contains: "GST on Purchases" } },
        { name: { contains: "Input Tax" } },
        { taxType: "GSTPaid" },
        { subType: "GSTPaid" },
      ],
    },
  })

  const gstCollectedIds = gstCollectedAccounts.map((a) => a.id)
  const gstPaidIds = gstPaidAccounts.map((a) => a.id)

  // Fetch journal lines for GST accounts within the financial year
  const gstLines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: [...gstCollectedIds, ...gstPaidIds] },
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: fyDates.start, lte: fyDates.end },
      },
    },
    include: {
      journalEntry: true,
    },
  })

  // Calculate totals for the full year
  let totalGSTOnSales = 0 // 1A: credits to GST Collected
  let totalGSTOnPurchases = 0 // 1B: debits to GST Paid

  for (const line of gstLines) {
    if (gstCollectedIds.includes(line.accountId)) {
      totalGSTOnSales += line.credit - line.debit
    } else if (gstPaidIds.includes(line.accountId)) {
      totalGSTOnPurchases += line.debit - line.credit
    }
  }

  const netGST = totalGSTOnSales - totalGSTOnPurchases

  // Calculate quarterly breakdown
  const quarterlyData = quarters.map((q) => {
    const qLines = gstLines.filter((l) => {
      const d = new Date(l.journalEntry.date)
      return d >= q.start && d <= q.end
    })

    let gstOnSales = 0
    let gstOnPurchases = 0

    for (const line of qLines) {
      if (gstCollectedIds.includes(line.accountId)) {
        gstOnSales += line.credit - line.debit
      } else if (gstPaidIds.includes(line.accountId)) {
        gstOnPurchases += line.debit - line.credit
      }
    }

    return {
      label: q.label,
      gstOnSales,
      gstOnPurchases,
      netGST: gstOnSales - gstOnPurchases,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">GST / BAS Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            {fyDates.label} &mdash; Australian Business Activity Statement
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Select financial year: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?fy=2026</code>
      </div>

      {gstCollectedIds.length === 0 && gstPaidIds.length === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          No GST accounts found. Ensure your chart of accounts includes GST Collected (Liability) and GST Paid (Asset) accounts.
        </div>
      )}

      {/* BAS Summary */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">BAS Summary &mdash; {fyDates.label}</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3 w-16">Label</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-indigo-600">1A</td>
              <td className="px-6 py-3 text-sm text-slate-700">GST on Sales</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(totalGSTOnSales)}
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-indigo-600">1B</td>
              <td className="px-6 py-3 text-sm text-slate-700">GST on Purchases</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(totalGSTOnPurchases)}
              </td>
            </tr>
            <tr className={`border-t-2 ${netGST >= 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
              <td className="px-6 py-4"></td>
              <td className="px-6 py-4 text-sm font-bold text-slate-900">
                {netGST >= 0 ? "Net GST Payable to ATO" : "Net GST Refund Due from ATO"}
              </td>
              <td className={`px-6 py-4 text-sm text-right font-mono font-bold tabular-nums ${netGST >= 0 ? "text-rose-700" : "text-emerald-700"}`}>
                {formatCurrency(Math.abs(netGST))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Quarterly Breakdown */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Quarterly Breakdown</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Quarter</th>
              <th className="px-6 py-3 text-right">1A: GST on Sales</th>
              <th className="px-6 py-3 text-right">1B: GST on Purchases</th>
              <th className="px-6 py-3 text-right">Net GST</th>
            </tr>
          </thead>
          <tbody>
            {quarterlyData.map((q) => (
              <tr key={q.label} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-6 py-3 text-sm font-medium text-slate-700">{q.label}</td>
                <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                  {formatCurrency(q.gstOnSales)}
                </td>
                <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                  {formatCurrency(q.gstOnPurchases)}
                </td>
                <td className={`px-6 py-3 text-sm text-right font-mono tabular-nums font-semibold ${q.netGST >= 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {q.netGST >= 0 ? "" : "("}{formatCurrency(Math.abs(q.netGST))}{q.netGST < 0 ? ")" : ""}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <td className="px-6 py-3 text-sm font-bold text-slate-900">Full Year Total</td>
              <td className="px-6 py-3 text-sm text-right font-mono font-bold tabular-nums text-slate-900">
                {formatCurrency(totalGSTOnSales)}
              </td>
              <td className="px-6 py-3 text-sm text-right font-mono font-bold tabular-nums text-slate-900">
                {formatCurrency(totalGSTOnPurchases)}
              </td>
              <td className={`px-6 py-3 text-sm text-right font-mono font-bold tabular-nums ${netGST >= 0 ? "text-rose-700" : "text-emerald-700"}`}>
                {netGST >= 0 ? "" : "("}{formatCurrency(Math.abs(netGST))}{netGST < 0 ? ")" : ""}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
