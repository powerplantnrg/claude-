import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PrintButton } from "./print-button"

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const { id } = await params

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
    include: {
      contact: true,
      lines: { include: { account: true } },
      organization: true,
    },
  })

  if (!invoice) notFound()

  const org = invoice.organization

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

  return (
    <>
      <style>{`
        @media print {
          /* Hide dashboard sidebar, header, and action buttons */
          nav, aside, header, [data-sidebar], .print\\:hidden {
            display: none !important;
          }
          /* Make the main content area fill the page */
          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          main > div {
            max-width: 100% !important;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Remove outer flex layout for print */
          body > div, body > div > div {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-3xl bg-white">
        {/* Action bar - hidden when printing */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <a
            href={`/invoices/${invoice.id}`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Back to Invoice
          </a>
          <PrintButton />
        </div>

        {/* Invoice document */}
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{org.name}</h1>
              {org.abn && (
                <p className="mt-1 text-sm text-slate-500">ABN: {org.abn}</p>
              )}
              {(org.address || org.city || org.state || org.postcode) && (
                <p className="mt-1 text-sm text-slate-500">
                  {[org.address, org.city, org.state, org.postcode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-indigo-600">
                Invoice
              </h2>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {invoice.invoiceNumber}
              </p>
            </div>
          </div>

          {/* Bill To and Dates */}
          <div className="mt-6 grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Bill To
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {invoice.contact.name}
              </p>
              {invoice.contact.email && (
                <p className="text-sm text-slate-600">{invoice.contact.email}</p>
              )}
            </div>
            <div className="text-right">
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date:{" "}
                  </span>
                  <span className="text-sm text-slate-900">
                    {formatDate(invoice.date)}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Due Date:{" "}
                  </span>
                  <span className="text-sm text-slate-900">
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status:{" "}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mt-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-300 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 px-4 text-right">Qty</th>
                  <th className="pb-3 px-4 text-right">Unit Price</th>
                  <th className="pb-3 px-4">Tax</th>
                  <th className="pb-3 pl-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr
                    key={line.id}
                    className="border-b border-slate-100"
                  >
                    <td className="py-3 pr-4 text-sm text-slate-900">
                      {line.description}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">
                      {line.quantity}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">
                      ${fmt(line.unitPrice)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {line.taxType || "None"}
                    </td>
                    <td className="py-3 pl-4 text-right text-sm font-medium text-slate-900">
                      ${fmt(line.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-2">
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
              <div className="flex justify-between border-t-2 border-slate-300 pt-2">
                <span className="text-base font-bold text-slate-900">Total</span>
                <span className="text-base font-bold text-slate-900">
                  ${fmt(invoice.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Notes / Payment Terms
              </h3>
              <p className="mt-2 text-sm text-slate-700">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
