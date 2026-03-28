import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import type { Metadata } from "next"
import { InvoicesTable } from "@/components/tables/invoices-table"
import { Plus, FileText, DollarSign, Clock, CheckCircle2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Invoices",
}

export default async function InvoicesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: orgId },
    include: { contact: { select: { name: true } } },
    orderBy: { date: "desc" },
  })

  const tableData = invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    contactName: invoice.contact.name,
    date: invoice.date.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    status: invoice.status,
    total: invoice.total,
  }))

  // Summary stats
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0)
  const paidCount = invoices.filter((i) => i.status === "Paid").length
  const overdueCount = invoices.filter((i) => i.status === "Overdue").length
  const draftCount = invoices.filter((i) => i.status === "Draft").length

  const stats = [
    { label: "Total Invoiced", value: formatCurrency(totalInvoiced), icon: DollarSign, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "Paid", value: paidCount.toString(), icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Overdue", value: overdueCount.toString(), icon: Clock, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
    { label: "Drafts", value: draftCount.toString(), icon: FileText, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-800" },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your sales invoices and track payments
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-500/20 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/30"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <InvoicesTable invoices={tableData} />
    </div>
  )
}
