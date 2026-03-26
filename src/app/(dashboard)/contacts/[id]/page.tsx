import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
    include: {
      invoices: {
        orderBy: { date: "desc" },
        take: 10,
      },
      bills: {
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  })

  if (!contact) notFound()

  const totalInvoiced = contact.invoices.reduce((sum, inv) => sum + inv.total, 0)
  const totalBilled = contact.bills.reduce((sum, bill) => sum + bill.total, 0)
  const outstandingInvoices = contact.invoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Voided"
  )
  const outstandingBills = contact.bills.filter(
    (b) => b.status !== "Paid" && b.status !== "Voided"
  )
  const outstandingReceivable = outstandingInvoices.reduce((sum, i) => sum + i.total, 0)
  const outstandingPayable = outstandingBills.reduce((sum, b) => sum + b.total, 0)

  const typeColors: Record<string, string> = {
    Customer: "bg-emerald-100 text-emerald-700",
    Supplier: "bg-blue-100 text-blue-700",
    Both: "bg-violet-100 text-violet-700",
  }

  const invoiceStatusColors: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-600",
    Sent: "bg-blue-100 text-blue-700",
    Overdue: "bg-red-100 text-red-700",
    Paid: "bg-green-100 text-green-700",
    Voided: "bg-slate-100 text-slate-400",
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/contacts" className="hover:text-indigo-600">Contacts</Link>
        <span>/</span>
        <span className="text-slate-700">{contact.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[contact.contactType] || "bg-slate-100 text-slate-700"}`}>
              {contact.contactType === "Both" ? "Customer & Supplier" : contact.contactType}
            </span>
            {contact.isRdContractor && (
              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                R&D Contractor
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Created {formatDate(contact.createdAt)}
          </p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Contact Details</h3>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Email</p>
              <p className="text-sm text-slate-900">{contact.email || "\u2014"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Phone</p>
              <p className="text-sm text-slate-900">{contact.phone || "\u2014"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">ABN</p>
              <p className="text-sm font-mono text-slate-900">{contact.abn || "\u2014"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Address</p>
              <p className="text-sm text-slate-900">
                {[contact.address, contact.city, contact.state, contact.postcode]
                  .filter(Boolean)
                  .join(", ") || "\u2014"}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="col-span-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Total Invoiced</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalInvoiced)}</p>
            <p className="text-xs text-slate-400">{contact.invoices.length} invoices</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Total Billed</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalBilled)}</p>
            <p className="text-xs text-slate-400">{contact.bills.length} bills</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-medium text-emerald-600">Outstanding Receivable</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{formatCurrency(outstandingReceivable)}</p>
            <p className="text-xs text-emerald-500">{outstandingInvoices.length} unpaid</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm font-medium text-rose-600">Outstanding Payable</p>
            <p className="mt-1 text-xl font-bold text-rose-700">{formatCurrency(outstandingPayable)}</p>
            <p className="text-xs text-rose-500">{outstandingBills.length} unpaid</p>
          </div>
        </div>
      </div>

      {/* Invoices */}
      {contact.invoices.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Number</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contact.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">
                      <Link href={`/invoices/${invoice.id}`} className="hover:text-indigo-600">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{formatDate(invoice.date)}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{formatDate(invoice.dueDate)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${invoiceStatusColors[invoice.status] || "bg-slate-100 text-slate-700"}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-900">
                      {formatCurrency(invoice.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bills */}
      {contact.bills.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Bills</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Number</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contact.bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">
                      {bill.billNumber}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{formatDate(bill.date)}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{formatDate(bill.dueDate)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${invoiceStatusColors[bill.status] || "bg-slate-100 text-slate-700"}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-900">
                      {formatCurrency(bill.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {contact.invoices.length === 0 && contact.bills.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">No invoices or bills recorded for this contact</p>
        </div>
      )}
    </div>
  )
}
