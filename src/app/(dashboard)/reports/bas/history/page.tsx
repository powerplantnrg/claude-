import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

export default async function BASHistoryPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const basReturns = await prisma.bASReturn.findMany({
    where: { organizationId: orgId },
    orderBy: { startDate: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
          <span>/</span>
          <Link href="/reports/bas" className="hover:text-indigo-600">BAS Preparation</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">BAS History</h1>
        <p className="mt-1 text-sm text-slate-500">Past Business Activity Statement returns</p>
      </div>

      {basReturns.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No BAS returns have been saved yet.</p>
          <Link
            href="/reports/bas"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Prepare a BAS Return
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3">Date Range</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">1A: GST on Sales</th>
                <th className="px-6 py-3 text-right">1B: GST on Purchases</th>
                <th className="px-6 py-3 text-right">Net GST</th>
                <th className="px-6 py-3">Lodged Date</th>
              </tr>
            </thead>
            <tbody>
              {basReturns.map((bas) => (
                <tr key={bas.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{bas.period}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {new Date(bas.startDate).toLocaleDateString("en-AU")} &ndash; {new Date(bas.endDate).toLocaleDateString("en-AU")}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      bas.status === "Lodged"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {bas.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                    {formatCurrency(bas.gstOnSales)}
                  </td>
                  <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-900">
                    {formatCurrency(bas.gstOnPurchases)}
                  </td>
                  <td className={`px-6 py-3 text-sm text-right font-mono tabular-nums font-semibold ${
                    bas.netGst >= 0 ? "text-rose-700" : "text-emerald-700"
                  }`}>
                    {formatCurrency(Math.abs(bas.netGst))}
                    {bas.netGst < 0 ? " (refund)" : ""}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {bas.lodgedAt ? new Date(bas.lodgedAt).toLocaleDateString("en-AU") : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail cards for each return */}
      {basReturns.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Return Details</h2>
          {basReturns.map((bas) => (
            <div key={bas.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{bas.period}</h3>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  bas.status === "Lodged"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {bas.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">G1 Total Sales</p>
                  <p className="mt-1 text-sm font-mono tabular-nums text-slate-900">{formatCurrency(bas.g1TotalSales)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">G2 Export Sales</p>
                  <p className="mt-1 text-sm font-mono tabular-nums text-slate-900">{formatCurrency(bas.g2ExportSales)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">G3 GST-Free Sales</p>
                  <p className="mt-1 text-sm font-mono tabular-nums text-slate-900">{formatCurrency(bas.g3GstFreeSales)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">G10 Capital Purchases</p>
                  <p className="mt-1 text-sm font-mono tabular-nums text-slate-900">{formatCurrency(bas.g10CapitalPurchases)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">G11 Non-Capital Purchases</p>
                  <p className="mt-1 text-sm font-mono tabular-nums text-slate-900">{formatCurrency(bas.g11NonCapitalPurchases)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">1A GST on Sales</p>
                  <p className="mt-1 text-sm font-mono tabular-nums text-slate-900">{formatCurrency(bas.gstOnSales)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">1B GST on Purchases</p>
                  <p className="mt-1 text-sm font-mono tabular-nums text-slate-900">{formatCurrency(bas.gstOnPurchases)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Net GST</p>
                  <p className={`mt-1 text-sm font-mono tabular-nums font-semibold ${bas.netGst >= 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {formatCurrency(Math.abs(bas.netGst))} {bas.netGst < 0 ? "(refund)" : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">W1 Total Wages</p>
                  <p className="mt-1 text-sm font-mono tabular-nums text-slate-900">{formatCurrency(bas.w1TotalWages)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">W2 PAYG Withheld</p>
                  <p className="mt-1 text-sm font-mono tabular-nums text-slate-900">{formatCurrency(bas.w2Withheld)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
