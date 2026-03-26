import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { InvoiceStatusActions } from "./status-actions"

const statusBadge: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Sent: "bg-blue-100 text-blue-700",
  Paid: "bg-green-100 text-green-700",
  Overdue: "bg-red-100 text-red-700",
  Void: "bg-slate-100 text-slate-500",
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id } = await params

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
    include: {
      contact: true,
      lines: { include: { account: true } },
    },
  })

  if (!invoice) notFound()

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {invoice.invoiceNumber}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                statusBadge[invoice.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {invoice.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Invoice to {invoice.contact.name}
          </p>
        </div>
        <Link
          href="/invoices"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Back to Invoices
        </Link>
      </div>

      {/* Invoice details card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Contact
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {invoice.contact.name}
            </dd>
            {invoice.contact.email && (
              <dd className="text-sm text-slate-500">
                {invoice.contact.email}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Invoice Date
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {new Date(invoice.date).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Due Date
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {new Date(invoice.dueDate).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total
            </dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">
              ${fmt(invoice.total)}
            </dd>
          </div>
        </div>
        {invoice.notes && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Notes
            </dt>
            <dd className="mt-1 text-sm text-slate-700">{invoice.notes}</dd>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Account
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Qty
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tax
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-slate-900">
                    {line.description}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {line.account.code} - {line.account.name}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-slate-600">
                    {line.quantity}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-slate-600">
                    ${fmt(line.unitPrice)}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {line.taxType || "None"}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                    ${fmt(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Totals row */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="ml-auto max-w-xs space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium text-slate-900">
                ${fmt(invoice.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">GST</span>
              <span className="font-medium text-slate-900">
                ${fmt(invoice.taxTotal)}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-1.5 flex justify-between">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">
                ${fmt(invoice.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status actions */}
      <InvoiceStatusActions invoiceId={invoice.id} status={invoice.status} />
    </div>
  )
}
