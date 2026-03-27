import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { QuoteStatusActions } from "./status-actions"

const statusBadge: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Sent: "bg-blue-100 text-blue-700",
  Accepted: "bg-green-100 text-green-700",
  Declined: "bg-red-100 text-red-700",
  Expired: "bg-amber-100 text-amber-700",
  Converted: "bg-purple-100 text-purple-700",
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id } = await params

  const quote = await prisma.quote.findFirst({
    where: { id, organizationId: orgId },
    include: {
      contact: true,
      lines: {
        include: { taxRate: true, account: true },
        orderBy: { sortOrder: "asc" },
      },
      convertedInvoice: true,
    },
  })

  if (!quote) notFound()

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
              {quote.quoteNumber}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                statusBadge[quote.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {quote.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Quote to {quote.contact.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/quotes"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Back to Quotes
          </Link>
        </div>
      </div>

      {/* Quote details card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Contact
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {quote.contact.name}
            </dd>
            {quote.contact.email && (
              <dd className="text-sm text-slate-500">
                {quote.contact.email}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Issue Date
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {new Date(quote.issueDate).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Expiry Date
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {new Date(quote.expiryDate).toLocaleDateString("en-AU", {
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
              ${fmt(quote.total)}
            </dd>
          </div>
        </div>
        {quote.reference && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Reference
            </dt>
            <dd className="mt-1 text-sm text-slate-700">{quote.reference}</dd>
          </div>
        )}
        {quote.notes && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Notes
            </dt>
            <dd className="mt-1 text-sm text-slate-700">{quote.notes}</dd>
          </div>
        )}
        {quote.terms && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Terms & Conditions
            </dt>
            <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{quote.terms}</dd>
          </div>
        )}
        {quote.acceptedAt && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Accepted
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {new Date(quote.acceptedAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {quote.acceptedByName && ` by ${quote.acceptedByName}`}
              {quote.acceptedByEmail && ` (${quote.acceptedByEmail})`}
            </dd>
          </div>
        )}
        {quote.convertedInvoice && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Converted Invoice
            </dt>
            <dd className="mt-1">
              <Link
                href={`/invoices/${quote.convertedInvoice.id}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {quote.convertedInvoice.invoiceNumber}
              </Link>
            </dd>
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
              {quote.lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-slate-900">
                    {line.description}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {line.account?.code} - {line.account?.name}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-slate-600">
                    {line.quantity}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-slate-600">
                    ${fmt(line.unitPrice)}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {line.taxRate?.name || (line.taxRateId ? "GST" : "None")}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                    ${fmt(line.lineAmount)}
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
                ${fmt(quote.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Tax</span>
              <span className="font-medium text-slate-900">
                ${fmt(quote.taxTotal)}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-1.5 flex justify-between">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">
                ${fmt(quote.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status actions */}
      <QuoteStatusActions quoteId={quote.id} status={quote.status} />
    </div>
  )
}
