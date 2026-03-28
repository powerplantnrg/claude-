import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { RecordPayment } from "./record-payment"
import { PaymentsTabs } from "./payments-tabs"

export const metadata = {
  title: "Payments",
}

export default async function PaymentsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const payments = await prisma.payment.findMany({
    where: { organizationId: orgId },
    include: {
      invoice: { include: { contact: { select: { name: true } } } },
      bill: { include: { contact: { select: { name: true } } } },
    },
    orderBy: { date: "desc" },
  })

  // Calculate this month's totals
  const monthPayments = payments.filter((p) => {
    const d = new Date(p.date)
    return d >= startOfMonth && d <= endOfMonth
  })

  const totalReceived = monthPayments
    .filter((p) => p.type === "received")
    .reduce((sum, p) => sum + p.amount, 0)

  const totalPaid = monthPayments
    .filter((p) => p.type === "made")
    .reduce((sum, p) => sum + p.amount, 0)

  const netCashFlow = totalReceived - totalPaid

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const methodLabel: Record<string, string> = {
    bank_transfer: "Bank Transfer",
    cash: "Cash",
    credit_card: "Credit Card",
    cheque: "Cheque",
  }

  const tableData = payments.map((payment) => ({
    id: payment.id,
    date: payment.date.toISOString(),
    type: payment.type,
    contactName:
      payment.type === "received"
        ? payment.invoice?.contact?.name || "-"
        : payment.bill?.contact?.name || "-",
    reference: payment.reference || "-",
    method: methodLabel[payment.method] || payment.method,
    amount: payment.amount,
    linkedDocument:
      payment.type === "received"
        ? payment.invoice?.invoiceNumber || "-"
        : payment.bill?.billNumber || "-",
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Record and track payments received and made
          </p>
        </div>
        <RecordPayment />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Received (This Month)
          </p>
          <p className="mt-2 text-2xl font-bold text-green-600">${fmt(totalReceived)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Paid (This Month)
          </p>
          <p className="mt-2 text-2xl font-bold text-red-600">${fmt(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Net Cash Flow (This Month)
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              netCashFlow >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {netCashFlow >= 0 ? "" : "-"}${fmt(Math.abs(netCashFlow))}
          </p>
        </div>
      </div>

      {/* Payments table with tabs */}
      <PaymentsTabs payments={tableData} />
    </div>
  )
}
