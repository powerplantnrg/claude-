import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { MonthlyInvoiceBillChart, PaymentTimelinessPieChart } from "./contact-charts"

export default async function ContactAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
    include: {
      invoices: { orderBy: { date: "asc" } },
      bills: { orderBy: { date: "asc" } },
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
    orderBy: { date: "asc" },
  })

  // --- KPI Calculations ---
  const totalRevenue = contact.invoices.reduce((sum, inv) => sum + inv.total, 0)
  const totalSpend = contact.bills.reduce((sum, bill) => sum + bill.total, 0)
  const avgInvoiceValue = contact.invoices.length > 0
    ? totalRevenue / contact.invoices.length
    : 0

  // Average payment days: for each paid invoice/bill, calculate days from issue to payment
  const paidInvoices = contact.invoices.filter((i) => i.status === "Paid")
  const paidBills = contact.bills.filter((b) => b.status === "Paid")

  let totalPaymentDays = 0
  let paymentCount = 0

  for (const inv of paidInvoices) {
    const payment = payments.find((p) => p.invoiceId === inv.id)
    if (payment) {
      const days = Math.floor(
        (payment.date.getTime() - inv.date.getTime()) / (1000 * 60 * 60 * 24)
      )
      totalPaymentDays += Math.max(0, days)
      paymentCount++
    }
  }

  for (const bill of paidBills) {
    const payment = payments.find((p) => p.billId === bill.id)
    if (payment) {
      const days = Math.floor(
        (payment.date.getTime() - bill.date.getTime()) / (1000 * 60 * 60 * 24)
      )
      totalPaymentDays += Math.max(0, days)
      paymentCount++
    }
  }

  const avgPaymentDays = paymentCount > 0 ? Math.round(totalPaymentDays / paymentCount) : 0

  // --- Payment Timeliness ---
  let onTime = 0
  let late = 0
  let unpaid = 0

  for (const inv of contact.invoices) {
    if (inv.status === "Paid") {
      const payment = payments.find((p) => p.invoiceId === inv.id)
      if (payment && payment.date <= inv.dueDate) {
        onTime++
      } else {
        late++
      }
    } else if (inv.status !== "Voided" && inv.status !== "Void" && inv.status !== "Draft") {
      unpaid++
    }
  }

  for (const bill of contact.bills) {
    if (bill.status === "Paid") {
      const payment = payments.find((p) => p.billId === bill.id)
      if (payment && payment.date <= bill.dueDate) {
        onTime++
      } else {
        late++
      }
    } else if (bill.status !== "Voided" && bill.status !== "Void" && bill.status !== "Draft") {
      unpaid++
    }
  }

  const totalTransactions = onTime + late + unpaid
  const onTimePercent = totalTransactions > 0 ? Math.round((onTime / totalTransactions) * 100) : 0
  const latePercent = totalTransactions > 0 ? Math.round((late / totalTransactions) * 100) : 0

  const timelinessData = [
    { name: "On Time", value: onTime },
    { name: "Late", value: late },
    { name: "Unpaid", value: unpaid },
  ]

  // --- Monthly Chart Data (last 12 months) ---
  const now = new Date()
  const monthlyData: { month: string; invoiced: number; billed: number }[] = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

    const invoiced = contact.invoices
      .filter((inv) => inv.date >= monthStart && inv.date <= monthEnd)
      .reduce((sum, inv) => sum + inv.total, 0)

    const billed = contact.bills
      .filter((bill) => bill.date >= monthStart && bill.date <= monthEnd)
      .reduce((sum, bill) => sum + bill.total, 0)

    monthlyData.push({ month: monthKey, invoiced, billed })
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href={`/contacts/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contact
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics: {contact.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Performance metrics and payment analysis
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total Revenue</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-slate-400">{contact.invoices.length} invoices</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total Spend</p>
          <p className="mt-1 text-xl font-bold text-blue-700">{formatCurrency(totalSpend)}</p>
          <p className="text-xs text-slate-400">{contact.bills.length} bills</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Avg Invoice Value</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(avgInvoiceValue)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Avg Payment Days</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{avgPaymentDays} days</p>
        </div>
      </div>

      {/* Payment Timeliness Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-600">Paid On Time</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{onTimePercent}%</p>
          <p className="text-xs text-emerald-500">{onTime} transactions</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-600">Paid Late</p>
          <p className="mt-1 text-xl font-bold text-amber-700">{latePercent}%</p>
          <p className="text-xs text-amber-500">{late} transactions</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-600">Avg Days to Payment</p>
          <p className="mt-1 text-xl font-bold text-slate-700">{avgPaymentDays} days</p>
          <p className="text-xs text-slate-400">{paymentCount} payments tracked</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonthlyInvoiceBillChart data={monthlyData} />
        <PaymentTimelinessPieChart data={timelinessData} />
      </div>
    </div>
  )
}
