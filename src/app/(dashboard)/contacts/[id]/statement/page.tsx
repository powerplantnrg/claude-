import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PrintButton } from "./print-button"

interface StatementEntry {
  date: Date
  type: "Invoice" | "Bill" | "Payment" | "Credit Note"
  reference: string
  description: string
  debit: number
  credit: number
}

export default async function ContactStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params
  const sp = await searchParams

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!contact) notFound()

  // Date range defaults to last 12 months
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const startDate = sp.from ? new Date(sp.from) : defaultFrom
  const endDate = sp.to ? new Date(sp.to) : now

  // Fetch all invoices, bills, payments, and credit notes for this contact
  const isCustomer = contact.contactType === "Customer" || contact.contactType === "Both"
  const isSupplier = contact.contactType === "Supplier" || contact.contactType === "Both"

  const [invoices, bills, creditNotes] = await Promise.all([
    isCustomer
      ? prisma.invoice.findMany({
          where: { contactId: id, organizationId: orgId },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    isSupplier
      ? prisma.bill.findMany({
          where: { contactId: id, organizationId: orgId },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    prisma.creditNote.findMany({
      where: { contactId: id, organizationId: orgId },
      orderBy: { date: "asc" },
    }),
  ])

  // Fetch payments linked to this contact's invoices and bills
  const invoiceIds = invoices.map((i) => i.id)
  const billIds = bills.map((b) => b.id)

  const payments = await prisma.payment.findMany({
    where: {
      organizationId: orgId,
      OR: [
        ...(invoiceIds.length > 0 ? [{ invoiceId: { in: invoiceIds } }] : []),
        ...(billIds.length > 0 ? [{ billId: { in: billIds } }] : []),
      ],
    },
    orderBy: { date: "asc" },
  })

  // Build statement entries
  const allEntries: StatementEntry[] = []

  for (const inv of invoices) {
    allEntries.push({
      date: inv.date,
      type: "Invoice",
      reference: inv.invoiceNumber,
      description: inv.notes || `Invoice ${inv.invoiceNumber}`,
      debit: inv.total,
      credit: 0,
    })
  }

  for (const bill of bills) {
    allEntries.push({
      date: bill.date,
      type: "Bill",
      reference: bill.billNumber,
      description: bill.notes || `Bill ${bill.billNumber}`,
      debit: 0,
      credit: bill.total,
    })
  }

  for (const payment of payments) {
    if (payment.type === "received") {
      allEntries.push({
        date: payment.date,
        type: "Payment",
        reference: payment.reference || "Payment",
        description: payment.notes || "Payment received",
        debit: 0,
        credit: payment.amount,
      })
    } else {
      allEntries.push({
        date: payment.date,
        type: "Payment",
        reference: payment.reference || "Payment",
        description: payment.notes || "Payment made",
        debit: payment.amount,
        credit: 0,
      })
    }
  }

  for (const cn of creditNotes) {
    allEntries.push({
      date: cn.date,
      type: "Credit Note",
      reference: cn.creditNoteNumber,
      description: cn.reason || `Credit Note ${cn.creditNoteNumber}`,
      debit: 0,
      credit: cn.total,
    })
  }

  // Sort by date
  allEntries.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Split into before-period (opening balance) and in-period entries
  const beforePeriod = allEntries.filter((e) => e.date < startDate)
  const inPeriod = allEntries.filter((e) => e.date >= startDate && e.date <= endDate)

  // Opening balance
  const openingBalance = beforePeriod.reduce((bal, e) => bal + e.debit - e.credit, 0)

  // Build running balance rows
  let runningBalance = openingBalance
  const rows = inPeriod.map((entry) => {
    runningBalance += entry.debit - entry.credit
    return { ...entry, balance: runningBalance }
  })

  const closingBalance = runningBalance

  // Summary
  const totalInvoiced = invoices
    .filter((i) => i.date >= startDate && i.date <= endDate)
    .reduce((sum, i) => sum + i.total, 0)
  const totalBilled = bills
    .filter((b) => b.date >= startDate && b.date <= endDate)
    .reduce((sum, b) => sum + b.total, 0)
  const totalPaid = payments
    .filter((p) => p.date >= startDate && p.date <= endDate)
    .reduce((sum, p) => sum + p.amount, 0)

  const typeColors: Record<string, string> = {
    Invoice: "bg-emerald-100 text-emerald-700",
    Bill: "bg-blue-100 text-blue-700",
    Payment: "bg-amber-100 text-amber-700",
    "Credit Note": "bg-rose-100 text-rose-700",
  }

  const formatISODate = (d: Date) => d.toISOString().split("T")[0]

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          nav, .print\\:hidden, button, header, aside { display: none !important; }
          body { background: white !important; }
          .print-container { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* Back navigation */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/contacts/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contact
        </Link>
        <PrintButton />
      </div>

      {/* Statement Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm print-container">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Account Statement</h1>
            <p className="mt-1 text-lg font-medium text-slate-700">{contact.name}</p>
            <p className="text-sm text-slate-500">
              {contact.contactType === "Both" ? "Customer & Supplier" : contact.contactType}
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>
              <span className="font-medium text-slate-700">Period:</span>{" "}
              {formatDate(startDate)} &mdash; {formatDate(endDate)}
            </p>
            {contact.abn && (
              <p className="mt-1 font-mono">ABN: {contact.abn}</p>
            )}
          </div>
        </div>

        {/* Date Range Filter */}
        <form className="mt-4 flex flex-wrap items-end gap-3 print:hidden" method="GET">
          <div>
            <label className="block text-xs font-medium text-slate-500">From</label>
            <input
              type="date"
              name="from"
              defaultValue={formatISODate(startDate)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">To</label>
            <input
              type="date"
              name="to"
              defaultValue={formatISODate(endDate)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Update
          </button>
        </form>
      </div>

      {/* Statement Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print-container">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-right">Debit</th>
                <th className="px-6 py-3 text-right">Credit</th>
                <th className="px-6 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Opening Balance */}
              <tr className="bg-slate-50 font-medium">
                <td className="px-6 py-3 text-sm text-slate-700">{formatDate(startDate)}</td>
                <td className="px-6 py-3 text-sm text-slate-700" colSpan={3}>
                  Opening Balance
                </td>
                <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700" />
                <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700" />
                <td className="px-6 py-3 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                  {formatCurrency(openingBalance)}
                </td>
              </tr>

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                    No transactions in this period
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-600">{formatDate(row.date)}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          typeColors[row.type] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-700">{row.reference}</td>
                    <td className="px-6 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                      {row.description}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                      {row.debit > 0 ? formatCurrency(row.debit) : ""}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                      {row.credit > 0 ? formatCurrency(row.credit) : ""}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-900">
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))
              )}

              {/* Closing Balance */}
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-medium">
                <td className="px-6 py-3 text-sm text-slate-700">{formatDate(endDate)}</td>
                <td className="px-6 py-3 text-sm text-slate-700" colSpan={3}>
                  Closing Balance
                </td>
                <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700" />
                <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700" />
                <td className="px-6 py-3 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                  {formatCurrency(closingBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 print-container">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total Invoiced</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalInvoiced)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total Billed</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalBilled)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total Paid</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-sm font-medium text-indigo-600">Outstanding Balance</p>
          <p className="mt-1 text-xl font-bold text-indigo-700">{formatCurrency(closingBalance)}</p>
        </div>
      </div>
    </div>
  )
}
