import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Purchase Orders",
}

export default async function PurchaseOrdersPage() {
  const session = await auth()
  if (!session) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { organizationId: orgId },
    include: { contact: { select: { name: true } } },
    orderBy: { date: "desc" },
  })

  const statusColors: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-700",
    Sent: "bg-blue-100 text-blue-700",
    Approved: "bg-green-100 text-green-700",
    Received: "bg-indigo-100 text-indigo-700",
    Cancelled: "bg-red-100 text-red-700",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage purchase orders to suppliers
          </p>
        </div>
        <Link
          href="/purchase-orders/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Purchase Order
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 text-left font-medium text-slate-600">PO Number</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Supplier</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Date</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Delivery Date</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-6 py-3 text-right font-medium text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-blue-600">
                    <Link href={`/purchase-orders/${po.id}`} className="hover:underline">
                      {po.poNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-slate-800">{po.contact.name}</td>
                  <td className="px-6 py-3 text-slate-600">{formatDate(po.date)}</td>
                  <td className="px-6 py-3 text-slate-600">
                    {po.deliveryDate ? formatDate(po.deliveryDate) : "-"}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[po.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-slate-800">
                    {formatCurrency(po.total)}
                  </td>
                </tr>
              ))}
              {purchaseOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No purchase orders yet. Create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
