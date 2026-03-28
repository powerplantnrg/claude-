import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Aged Payables",
}

interface AgingBuckets {
  current: number
  days1to30: number
  days31to60: number
  days61to90: number
  days90plus: number
  total: number
}

interface ContactAging extends AgingBuckets {
  contactId: string
  contactName: string
  billCount: number
}

function calculateDaysOverdue(dueDate: Date, today: Date): number {
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffMs = now.getTime() - due.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function bucketColor(bucket: string): string {
  switch (bucket) {
    case "current":
      return "text-green-700 bg-green-50"
    case "days1to30":
      return "text-yellow-700 bg-yellow-50"
    case "days31to60":
      return "text-orange-700 bg-orange-50"
    case "days61to90":
      return "text-red-700 bg-red-50"
    case "days90plus":
      return "text-red-900 bg-red-100"
    default:
      return ""
  }
}

function bucketHeaderColor(bucket: string): string {
  switch (bucket) {
    case "current":
      return "bg-green-100 text-green-800"
    case "days1to30":
      return "bg-yellow-100 text-yellow-800"
    case "days31to60":
      return "bg-orange-100 text-orange-800"
    case "days61to90":
      return "bg-red-100 text-red-800"
    case "days90plus":
      return "bg-red-200 text-red-900"
    default:
      return "bg-slate-100 text-slate-800"
  }
}

export default async function AgedPayablesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const today = new Date()

  const bills = await prisma.bill.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["RECEIVED", "OVERDUE", "Received", "Overdue"] },
    },
    include: {
      contact: true,
    },
    orderBy: { dueDate: "asc" },
  })

  // Group by contact and calculate aging buckets
  const contactMap = new Map<string, ContactAging>()

  for (const bill of bills) {
    const daysOverdue = calculateDaysOverdue(bill.dueDate, today)

    if (!contactMap.has(bill.contactId)) {
      contactMap.set(bill.contactId, {
        contactId: bill.contactId,
        contactName: bill.contact.name,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
        total: 0,
        billCount: 0,
      })
    }

    const entry = contactMap.get(bill.contactId)!
    entry.billCount++
    entry.total += bill.total

    if (daysOverdue <= 0) {
      entry.current += bill.total
    } else if (daysOverdue <= 30) {
      entry.days1to30 += bill.total
    } else if (daysOverdue <= 60) {
      entry.days31to60 += bill.total
    } else if (daysOverdue <= 90) {
      entry.days61to90 += bill.total
    } else {
      entry.days90plus += bill.total
    }
  }

  const contactRows = Array.from(contactMap.values()).sort((a, b) => b.total - a.total)

  // Summary totals
  const totals: AgingBuckets = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90plus: 0,
    total: 0,
  }

  for (const row of contactRows) {
    totals.current += row.current
    totals.days1to30 += row.days1to30
    totals.days31to60 += row.days31to60
    totals.days61to90 += row.days61to90
    totals.days90plus += row.days90plus
    totals.total += row.total
  }

  const totalOverdue = totals.days1to30 + totals.days31to60 + totals.days61to90 + totals.days90plus
  const overdueContacts = contactRows.filter(
    (r) => r.days1to30 > 0 || r.days31to60 > 0 || r.days61to90 > 0 || r.days90plus > 0
  ).length

  // Average days outstanding
  let totalWeightedDays = 0
  let totalAmount = 0
  for (const bill of bills) {
    const daysOverdue = calculateDaysOverdue(bill.dueDate, today)
    totalWeightedDays += Math.max(0, daysOverdue) * bill.total
    totalAmount += bill.total
  }
  const avgDaysOutstanding = totalAmount > 0 ? Math.round(totalWeightedDays / totalAmount) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Aged Payables</h1>
          <p className="mt-1 text-sm text-slate-500">
            Outstanding supplier bills grouped by aging period
          </p>
        </div>
        <Link
          href="/reports"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Back to Reports
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totals.total)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Overdue</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Avg Days Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{avgDaysOutstanding} days</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Overdue Suppliers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{overdueContacts}</p>
        </div>
      </div>

      {/* Aging table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Supplier
                </th>
                <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${bucketHeaderColor("current")}`}>
                  Current
                </th>
                <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${bucketHeaderColor("days1to30")}`}>
                  1-30 Days
                </th>
                <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${bucketHeaderColor("days31to60")}`}>
                  31-60 Days
                </th>
                <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${bucketHeaderColor("days61to90")}`}>
                  61-90 Days
                </th>
                <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${bucketHeaderColor("days90plus")}`}>
                  90+ Days
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contactRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No outstanding payables found.
                  </td>
                </tr>
              )}
              {contactRows.map((row) => (
                <tr key={row.contactId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {row.contactName}
                    <span className="ml-2 text-xs text-slate-400">
                      ({row.billCount} bill{row.billCount !== 1 ? "s" : ""})
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${row.current > 0 ? bucketColor("current") : "text-slate-400"}`}>
                    {row.current > 0 ? formatCurrency(row.current) : "-"}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${row.days1to30 > 0 ? bucketColor("days1to30") : "text-slate-400"}`}>
                    {row.days1to30 > 0 ? formatCurrency(row.days1to30) : "-"}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${row.days31to60 > 0 ? bucketColor("days31to60") : "text-slate-400"}`}>
                    {row.days31to60 > 0 ? formatCurrency(row.days31to60) : "-"}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${row.days61to90 > 0 ? bucketColor("days61to90") : "text-slate-400"}`}>
                    {row.days61to90 > 0 ? formatCurrency(row.days61to90) : "-"}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${row.days90plus > 0 ? bucketColor("days90plus") : "text-slate-400"}`}>
                    {row.days90plus > 0 ? formatCurrency(row.days90plus) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            {contactRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3 text-sm text-slate-900">Total</td>
                  <td className={`px-4 py-3 text-right text-sm ${bucketColor("current")}`}>
                    {formatCurrency(totals.current)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm ${bucketColor("days1to30")}`}>
                    {formatCurrency(totals.days1to30)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm ${bucketColor("days31to60")}`}>
                    {formatCurrency(totals.days31to60)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm ${bucketColor("days61to90")}`}>
                    {formatCurrency(totals.days61to90)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm ${bucketColor("days90plus")}`}>
                    {formatCurrency(totals.days90plus)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                    {formatCurrency(totals.total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
