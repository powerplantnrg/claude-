import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

function getFinancialYearDates(year?: string): { start: Date; end: Date; label: string; fyEnd: number } {
  const now = new Date()
  if (year) {
    const fy = parseInt(year, 10)
    return {
      start: new Date(fy - 1, 6, 1),
      end: new Date(fy, 5, 30, 23, 59, 59),
      label: `FY ${fy - 1}/${fy}`,
      fyEnd: fy,
    }
  }
  const fyEnd = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  return {
    start: new Date(fyEnd - 1, 6, 1),
    end: new Date(fyEnd, 5, 30, 23, 59, 59),
    label: `FY ${fyEnd - 1}/${fyEnd}`,
    fyEnd,
  }
}

export default async function TaxSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const params = await searchParams
  const fyDates = getFinancialYearDates(params.fy)

  // Revenue accounts
  const revenueAccounts = await prisma.account.findMany({
    where: { organizationId: orgId, type: "Revenue" },
  })
  const revenueIds = revenueAccounts.map((a) => a.id)

  // Expense accounts
  const expenseAccounts = await prisma.account.findMany({
    where: { organizationId: orgId, type: "Expense" },
  })
  const expenseIds = expenseAccounts.map((a) => a.id)

  // GST accounts
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

  const allIds = [...revenueIds, ...expenseIds, ...gstCollectedIds, ...gstPaidIds]

  const journalLines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: allIds },
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: fyDates.start, lte: fyDates.end },
      },
    },
    include: { journalEntry: true },
  })

  let totalRevenue = 0
  let totalExpenses = 0
  let totalGstCollected = 0
  let totalGstPaid = 0

  for (const line of journalLines) {
    if (revenueIds.includes(line.accountId)) {
      totalRevenue += line.credit - line.debit
    }
    if (expenseIds.includes(line.accountId)) {
      totalExpenses += line.debit - line.credit
    }
    if (gstCollectedIds.includes(line.accountId)) {
      totalGstCollected += line.credit - line.debit
    }
    if (gstPaidIds.includes(line.accountId)) {
      totalGstPaid += line.debit - line.credit
    }
  }

  const taxableIncome = totalRevenue - totalExpenses
  const companyTaxRate = 0.25
  const incomeTax = Math.max(0, taxableIncome * companyTaxRate)

  // R&D Tax Offset estimate from claim drafts
  const claimDrafts = await prisma.rdClaimDraft.findMany({
    where: {
      financialYear: fyDates.label,
      status: { in: ["Draft", "Submitted", "Approved"] },
    },
  })
  const rdTaxOffset = claimDrafts.reduce((sum, c) => sum + c.estimatedOffset, 0)

  const netTaxPosition = incomeTax - rdTaxOffset
  const netGst = totalGstCollected - totalGstPaid

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Tax Summary</h1>
        <p className="mt-1 text-sm text-slate-500">
          Annual tax position overview &mdash; {fyDates.label}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Financial year: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?fy=2026</code> for FY 2025-26
      </div>

      {/* Income Tax Estimate */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Income Tax Estimate</h2>
        </div>
        <table className="w-full">
          <tbody>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm text-slate-700">Total Revenue</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(totalRevenue)}
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm text-slate-700">Total Deductible Expenses</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(totalExpenses)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-slate-900">Taxable Income</td>
              <td className={`px-6 py-3 text-sm text-right font-mono tabular-nums font-semibold ${taxableIncome >= 0 ? "text-slate-900" : "text-rose-700"}`}>
                {formatCurrency(taxableIncome)}
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm text-slate-700">Company Tax Rate</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">25%</td>
            </tr>
            <tr className="border-t-2 border-indigo-200 bg-indigo-50">
              <td className="px-6 py-4 text-sm font-bold text-slate-900">Estimated Income Tax</td>
              <td className="px-6 py-4 text-sm text-right font-mono font-bold tabular-nums text-indigo-700">
                {formatCurrency(incomeTax)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* R&D Tax Offset */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">R&D Tax Incentive Offset</h2>
        </div>
        <table className="w-full">
          <tbody>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm text-slate-700">Estimated R&D Tax Offset</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-emerald-700">
                {formatCurrency(rdTaxOffset)}
              </td>
            </tr>
            {claimDrafts.length === 0 && (
              <tr className="border-b border-slate-100">
                <td colSpan={2} className="px-6 py-3 text-sm text-slate-500 italic">
                  No R&D claim drafts found for {fyDates.label}. Visit{" "}
                  <Link href="/rd/claims" className="text-indigo-600 hover:underline">R&D Claims</Link>
                  {" "}to create one.
                </td>
              </tr>
            )}
            {claimDrafts.map((draft) => (
              <tr key={draft.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-6 py-3 text-sm text-slate-600">
                  Claim: {draft.financialYear} (Eligible: {formatCurrency(draft.totalEligibleExpenditure)} at {(draft.offsetRate * 100).toFixed(1)}%)
                </td>
                <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-emerald-700">
                  {formatCurrency(draft.estimatedOffset)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Net Tax Position */}
      <div className={`rounded-xl border-2 p-6 ${netTaxPosition > 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Net Tax Position</p>
            <p className="text-xs text-slate-500 mt-1">Income Tax - R&D Offset</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${netTaxPosition > 0 ? "text-rose-700" : "text-emerald-700"}`}>
              {formatCurrency(Math.abs(netTaxPosition))}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {netTaxPosition > 0 ? "Estimated tax payable" : netTaxPosition < 0 ? "Estimated refund position" : "No tax payable"}
            </p>
          </div>
        </div>
      </div>

      {/* GST Summary */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">GST Summary &mdash; {fyDates.label}</h2>
        </div>
        <table className="w-full">
          <tbody>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm text-slate-700">Total GST Collected</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(totalGstCollected)}
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm text-slate-700">Total GST Paid (Input Credits)</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(totalGstPaid)}
              </td>
            </tr>
            <tr className={`border-t-2 ${netGst >= 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
              <td className="px-6 py-4 text-sm font-bold text-slate-900">
                {netGst >= 0 ? "Net GST Payable" : "Net GST Refundable"}
              </td>
              <td className={`px-6 py-4 text-sm text-right font-mono font-bold tabular-nums ${netGst >= 0 ? "text-rose-700" : "text-emerald-700"}`}>
                {formatCurrency(Math.abs(netGst))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PAYG Summary Placeholder */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">PAYG Summary</h2>
        </div>
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-slate-500">
            PAYG Instalment summary will be available in a future update.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            This section will include PAYG instalment calculations based on business income.
          </p>
        </div>
      </div>
    </div>
  )
}
