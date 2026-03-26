import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ContactTabs } from "./contact-tabs"
import { DeleteContactButton } from "./delete-contact-button"

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
      },
      bills: {
        orderBy: { date: "desc" },
      },
    },
  })

  if (!contact) notFound()

  // Fetch payments linked to this contact's invoices and bills
  const invoiceIds = contact.invoices.map((i) => i.id)
  const billIds = contact.bills.map((b) => b.id)

  const payments = await prisma.payment.findMany({
    where: {
      organizationId: orgId,
      OR: [
        ...(invoiceIds.length > 0 ? [{ invoiceId: { in: invoiceIds } }] : []),
        ...(billIds.length > 0 ? [{ billId: { in: billIds } }] : []),
      ],
    },
    orderBy: { date: "desc" },
  })

  const totalInvoiced = contact.invoices.reduce((sum, inv) => sum + inv.total, 0)
  const totalBilled = contact.bills.reduce((sum, bill) => sum + bill.total, 0)
  const outstandingInvoices = contact.invoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Voided" && i.status !== "Void"
  )
  const outstandingBills = contact.bills.filter(
    (b) => b.status !== "Paid" && b.status !== "Voided" && b.status !== "Void"
  )
  const outstandingReceivable = outstandingInvoices.reduce((sum, i) => sum + i.total, 0)
  const outstandingPayable = outstandingBills.reduce((sum, b) => sum + b.total, 0)
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  const typeColors: Record<string, string> = {
    Customer: "bg-emerald-100 text-emerald-700",
    Supplier: "bg-blue-100 text-blue-700",
    Both: "bg-violet-100 text-violet-700",
  }

  // Serialize dates for client component
  const serializedInvoices = contact.invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    status: inv.status,
    total: inv.total,
  }))

  const serializedBills = contact.bills.map((bill) => ({
    id: bill.id,
    billNumber: bill.billNumber,
    date: bill.date.toISOString(),
    dueDate: bill.dueDate.toISOString(),
    status: bill.status,
    total: bill.total,
  }))

  const serializedPayments = payments.map((p) => ({
    id: p.id,
    type: p.type,
    amount: p.amount,
    date: p.date.toISOString(),
    reference: p.reference,
    method: p.method,
    invoiceId: p.invoiceId,
    billId: p.billId,
    notes: p.notes,
  }))

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

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
        <div className="flex items-center gap-3">
          <Link
            href={`/contacts/${contact.id}/edit`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
          <Link
            href={`/invoices/new?contactId=${contact.id}`}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            New Invoice
          </Link>
          <Link
            href={`/bills/new?contactId=${contact.id}`}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            New Bill
          </Link>
          <DeleteContactButton contactId={contact.id} contactName={contact.name} />
        </div>
      </div>

      {/* Contact Info Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Contact Details</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

      {/* Tabs */}
      <ContactTabs
        contactId={contact.id}
        invoices={serializedInvoices}
        bills={serializedBills}
        payments={serializedPayments}
        totalInvoiced={totalInvoiced}
        totalBilled={totalBilled}
        outstandingReceivable={outstandingReceivable}
        outstandingPayable={outstandingPayable}
        totalPaid={totalPaid}
      />
    </div>
  )
}
