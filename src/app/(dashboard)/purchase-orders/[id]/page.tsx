import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { POActions } from "./po-actions"

const statusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-100 text-blue-700",
  Approved: "bg-green-100 text-green-700",
  Received: "bg-indigo-100 text-indigo-700",
  Billed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-red-100 text-red-700",
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: orgId },
    include: {
      contact: { select: { id: true, name: true } },
      lines: true,
    },
  })

  if (!po) notFound()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/purchase-orders" className="hover:text-blue-600">
          Purchase Orders
        </Link>
        <span>/</span>
        <span className="text-slate-700">{po.poNumber}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{po.poNumber}</h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                statusColors[po.status] || "bg-slate-100 text-slate-700"
              }`}
            >
              {po.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Supplier:{" "}
            <span className="font-medium text-slate-800">{po.contact.name}</span>
          </p>
        </div>
        <POActions
          poId={po.id}
          status={po.status}
          poData={{
            contactId: po.contactId,
            lines: po.lines.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              accountId: l.accountId,
              taxType: l.taxType,
              amount: l.amount,
              taxAmount: l.taxAmount,
            })),
            notes: po.notes,
          }}
        />
      </div>

      {/* Details Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Date</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatDate(po.date)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Delivery Date</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {po.deliveryDate ? formatDate(po.deliveryDate) : "Not set"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Subtotal</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatCurrency(po.subtotal)}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-medium text-blue-600">Total</p>
          <p className="mt-1 text-lg font-bold text-blue-700">
            {formatCurrency(po.total)}
          </p>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 text-left font-medium text-slate-600">
                  Description
                </th>
                <th className="px-6 py-3 text-right font-medium text-slate-600">
                  Qty
                </th>
                <th className="px-6 py-3 text-right font-medium text-slate-600">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">
                  Tax
                </th>
                <th className="px-6 py-3 text-right font-medium text-slate-600">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-b border-slate-50 hover:bg-slate-50"
                >
                  <td className="px-6 py-3 text-slate-800">
                    {line.description}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-slate-600">
                    {line.quantity}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-slate-600">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{line.taxType}</td>
                  <td className="px-6 py-3 text-right tabular-nums font-medium text-slate-800">
                    {formatCurrency(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-col items-end space-y-1">
            <div className="flex w-56 justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="tabular-nums text-slate-700">
                {formatCurrency(po.subtotal)}
              </span>
            </div>
            <div className="flex w-56 justify-between text-sm">
              <span className="text-slate-500">Tax</span>
              <span className="tabular-nums text-slate-700">
                {formatCurrency(po.taxTotal)}
              </span>
            </div>
            <div className="flex w-56 justify-between border-t border-slate-200 pt-1 text-base font-bold">
              <span className="text-slate-700">Total</span>
              <span className="tabular-nums text-slate-900">
                {formatCurrency(po.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {po.notes && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
          <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">
            {po.notes}
          </p>
        </div>
      )}
    </div>
  )
}
