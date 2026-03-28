import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { BASActions } from "./bas-actions"

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

function getQuarterDates(fyEnd: number) {
  const year = fyEnd - 1
  return [
    { key: "Q1", label: "Q1 (Jul-Sep)", start: new Date(year, 6, 1), end: new Date(year, 8, 30, 23, 59, 59) },
    { key: "Q2", label: "Q2 (Oct-Dec)", start: new Date(year, 9, 1), end: new Date(year, 11, 31, 23, 59, 59) },
    { key: "Q3", label: "Q3 (Jan-Mar)", start: new Date(year + 1, 0, 1), end: new Date(year + 1, 2, 31, 23, 59, 59) },
    { key: "Q4", label: "Q4 (Apr-Jun)", start: new Date(year + 1, 3, 1), end: new Date(year + 1, 5, 30, 23, 59, 59) },
  ]
}

function getMonthDates(fyEnd: number) {
  const months = [
    { key: "Jul", label: "July" },
    { key: "Aug", label: "August" },
    { key: "Sep", label: "September" },
    { key: "Oct", label: "October" },
    { key: "Nov", label: "November" },
    { key: "Dec", label: "December" },
    { key: "Jan", label: "January" },
    { key: "Feb", label: "February" },
    { key: "Mar", label: "March" },
    { key: "Apr", label: "April" },
    { key: "May", label: "May" },
    { key: "Jun", label: "June" },
  ]
  const monthNums = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5]
  return months.map((m, i) => {
    const mn = monthNums[i]
    const yr = mn >= 6 ? fyEnd - 1 : fyEnd
    const lastDay = new Date(yr, mn + 1, 0).getDate()
    return {
      key: m.key,
      label: m.label,
      start: new Date(yr, mn, 1),
      end: new Date(yr, mn, lastDay, 23, 59, 59),
    }
  })
}

export default async function BASPreparationPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; mode?: string; period?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const params = await searchParams
  const fyDates = getFinancialYearDates(params.fy)
  const mode = params.mode || "quarterly"
  const selectedPeriod = params.period || (mode === "quarterly" ? "Q1" : "Jul")

  // Determine period start/end
  let periodStart: Date
  let periodEnd: Date
  let periodLabel: string

  if (mode === "monthly") {
    const months = getMonthDates(fyDates.fyEnd)
    const m = months.find((x) => x.key === selectedPeriod) || months[0]
    periodStart = m.start
    periodEnd = m.end
    periodLabel = `${m.label} ${m.start.getFullYear()}`
  } else {
    const quarters = getQuarterDates(fyDates.fyEnd)
    const q = quarters.find((x) => x.key === selectedPeriod) || quarters[0]
    periodStart = q.start
    periodEnd = q.end
    periodLabel = q.label
  }

  // Fetch all needed accounts
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

  const revenueAccounts = await prisma.account.findMany({
    where: { organizationId: orgId, type: "Revenue" },
  })

  const exportAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      type: "Revenue",
      OR: [
        { name: { contains: "Export" } },
        { taxType: "GSTFreeExport" },
        { subType: "ExportRevenue" },
      ],
    },
  })

  const gstFreeAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      type: "Revenue",
      OR: [
        { taxType: "GSTFree" },
        { subType: "GSTFreeRevenue" },
        { name: { contains: "GST-Free" } },
        { name: { contains: "GST Free" } },
      ],
    },
  })

  const assetAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { type: "Asset", subType: "FixedAsset" },
        { type: "Asset", name: { contains: "Equipment" } },
        { type: "Asset", name: { contains: "Plant" } },
        { type: "Asset", name: { contains: "Vehicle" } },
        { type: "Asset", name: { contains: "Capital" } },
      ],
    },
  })

  const expenseAccounts = await prisma.account.findMany({
    where: { organizationId: orgId, type: "Expense" },
  })

  const wageAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: { contains: "Wages" } },
        { name: { contains: "Salaries" } },
        { name: { contains: "Salary" } },
        { subType: "Wages" },
      ],
    },
  })

  const paygAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: { contains: "PAYG" } },
        { name: { contains: "Withholding" } },
        { taxType: "PAYG" },
        { subType: "PAYGWithholding" },
      ],
    },
  })

  const gstCollectedIds = gstCollectedAccounts.map((a) => a.id)
  const gstPaidIds = gstPaidAccounts.map((a) => a.id)
  const revenueIds = revenueAccounts.map((a) => a.id)
  const exportIds = exportAccounts.map((a) => a.id)
  const gstFreeIds = gstFreeAccounts.map((a) => a.id)
  const assetIds = assetAccounts.map((a) => a.id)
  const expenseIds = expenseAccounts.map((a) => a.id)
  const wageIds = wageAccounts.map((a) => a.id)
  const paygIds = paygAccounts.map((a) => a.id)

  const allIds = [
    ...gstCollectedIds, ...gstPaidIds, ...revenueIds,
    ...assetIds, ...expenseIds, ...wageIds, ...paygIds,
  ]

  const journalLines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: allIds },
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: periodStart, lte: periodEnd },
      },
    },
    include: { journalEntry: true },
  })

  let g1TotalSales = 0
  let g2ExportSales = 0
  let g3GstFreeSales = 0
  let g10CapitalPurchases = 0
  let g11NonCapitalPurchases = 0
  let gstOnSales = 0
  let gstOnPurchases = 0
  let w1TotalWages = 0
  let w2Withheld = 0

  for (const line of journalLines) {
    const netCredit = line.credit - line.debit
    const netDebit = line.debit - line.credit

    if (gstCollectedIds.includes(line.accountId)) gstOnSales += netCredit
    if (gstPaidIds.includes(line.accountId)) gstOnPurchases += netDebit
    if (revenueIds.includes(line.accountId)) g1TotalSales += netCredit
    if (exportIds.includes(line.accountId)) g2ExportSales += netCredit
    if (gstFreeIds.includes(line.accountId)) g3GstFreeSales += netCredit
    if (assetIds.includes(line.accountId)) g10CapitalPurchases += netDebit
    if (expenseIds.includes(line.accountId)) g11NonCapitalPurchases += netDebit
    if (wageIds.includes(line.accountId)) w1TotalWages += netDebit
    if (paygIds.includes(line.accountId)) w2Withheld += netCredit
  }

  const netGst = gstOnSales - gstOnPurchases

  // Check existing BAS return status
  const fyYear = fyDates.fyEnd
  const basLabel = selectedPeriod.startsWith("Q")
    ? `${selectedPeriod} ${fyYear - 1}-${String(fyYear).slice(2)}`
    : `${selectedPeriod} ${periodStart.getFullYear()}`

  const existingBas = await prisma.bASReturn.findFirst({
    where: { organizationId: orgId, period: basLabel },
  })

  const quarters = getQuarterDates(fyDates.fyEnd)
  const months = getMonthDates(fyDates.fyEnd)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">BAS Preparation</h1>
          <p className="mt-1 text-sm text-slate-500">
            {fyDates.label} &mdash; Australian Business Activity Statement
          </p>
        </div>
        <Link
          href="/reports/bas/history"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View BAS History
        </Link>
      </div>

      {/* Period Selector */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Select Period</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700">Mode:</span>
            <Link
              href={`/reports/bas?fy=${fyDates.fyEnd}&mode=quarterly&period=Q1`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "quarterly" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              Quarterly
            </Link>
            <Link
              href={`/reports/bas?fy=${fyDates.fyEnd}&mode=monthly&period=Jul`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "monthly" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              Monthly
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {mode === "quarterly"
              ? quarters.map((q) => (
                  <Link
                    key={q.key}
                    href={`/reports/bas?fy=${fyDates.fyEnd}&mode=quarterly&period=${q.key}`}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${selectedPeriod === q.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                  >
                    {q.label}
                  </Link>
                ))
              : months.map((m) => (
                  <Link
                    key={m.key}
                    href={`/reports/bas?fy=${fyDates.fyEnd}&mode=monthly&period=${m.key}`}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${selectedPeriod === m.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                  >
                    {m.key}
                  </Link>
                ))
            }
          </div>

          <div className="text-sm text-slate-500">
            Financial year: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?fy=2026</code> for FY 2025-26
          </div>
        </div>
      </div>

      {/* GST Summary Card */}
      <div className={`rounded-xl border-2 p-6 ${netGst >= 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">
              {netGst >= 0 ? "GST Payable to ATO" : "GST Refundable from ATO"}
            </p>
            <p className={`mt-1 text-3xl font-bold ${netGst >= 0 ? "text-rose-700" : "text-emerald-700"}`}>
              {formatCurrency(Math.abs(netGst))}
            </p>
            <p className="mt-1 text-sm text-slate-500">Period: {periodLabel}</p>
          </div>
          <div className="text-right">
            {existingBas?.status === "Lodged" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                Lodged {existingBas.lodgedAt ? new Date(existingBas.lodgedAt).toLocaleDateString("en-AU") : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                Draft
              </span>
            )}
          </div>
        </div>
      </div>

      {/* BAS Fields Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            BAS Fields &mdash; {periodLabel}
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3 w-20">Label</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* GST Section */}
            <tr className="border-b border-slate-100 bg-slate-50">
              <td colSpan={3} className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                GST on Sales
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-indigo-600">G1</td>
              <td className="px-6 py-3 text-sm text-slate-700">Total Sales (excluding GST)</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(g1TotalSales)}
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-indigo-600">G2</td>
              <td className="px-6 py-3 text-sm text-slate-700">Export Sales</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(g2ExportSales)}
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-indigo-600">G3</td>
              <td className="px-6 py-3 text-sm text-slate-700">Other GST-Free Sales</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(g3GstFreeSales)}
              </td>
            </tr>

            <tr className="border-b border-slate-100 bg-slate-50">
              <td colSpan={3} className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                GST on Purchases
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-indigo-600">G10</td>
              <td className="px-6 py-3 text-sm text-slate-700">Capital Purchases</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(g10CapitalPurchases)}
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-indigo-600">G11</td>
              <td className="px-6 py-3 text-sm text-slate-700">Non-Capital Purchases</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(g11NonCapitalPurchases)}
              </td>
            </tr>

            <tr className="border-b border-slate-100 bg-slate-50">
              <td colSpan={3} className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                GST Calculation
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-indigo-600">1A</td>
              <td className="px-6 py-3 text-sm text-slate-700">GST on Sales</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(gstOnSales)}
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-indigo-600">1B</td>
              <td className="px-6 py-3 text-sm text-slate-700">GST on Purchases</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(gstOnPurchases)}
              </td>
            </tr>
            <tr className={`border-t-2 ${netGst >= 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
              <td className="px-6 py-4"></td>
              <td className="px-6 py-4 text-sm font-bold text-slate-900">
                {netGst >= 0 ? "Net GST Payable" : "Net GST Refundable"}
              </td>
              <td className={`px-6 py-4 text-sm text-right font-mono font-bold tabular-nums ${netGst >= 0 ? "text-rose-700" : "text-emerald-700"}`}>
                {formatCurrency(Math.abs(netGst))}
              </td>
            </tr>

            {/* PAYG Section */}
            <tr className="border-b border-slate-100 bg-slate-50">
              <td colSpan={3} className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                PAYG Withholding
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-indigo-600">W1</td>
              <td className="px-6 py-3 text-sm text-slate-700">Total Salary, Wages &amp; Other Payments</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(w1TotalWages)}
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm font-semibold text-indigo-600">W2</td>
              <td className="px-6 py-3 text-sm text-slate-700">Amount Withheld from Payments (PAYG)</td>
              <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(w2Withheld)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <BASActions
        period={selectedPeriod}
        fy={String(fyDates.fyEnd)}
        isLodged={existingBas?.status === "Lodged"}
      />
    </div>
  )
}
