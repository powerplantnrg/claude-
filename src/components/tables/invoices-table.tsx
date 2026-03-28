"use client"

import Link from "next/link"
import { DataTable, Column } from "@/components/ui/data-table"
import { FileText } from "lucide-react"

const statusConfig: Record<string, { dot: string; text: string; bg: string; ring: string }> = {
  Draft: { dot: "bg-slate-400", text: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-700", ring: "ring-slate-500/10 dark:ring-slate-400/20" },
  Sent: { dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-900/30", ring: "ring-blue-600/10 dark:ring-blue-400/20" },
  Paid: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/30", ring: "ring-emerald-600/10 dark:ring-emerald-400/20" },
  Overdue: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-900/30", ring: "ring-rose-600/10 dark:ring-rose-400/20" },
  Void: { dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", ring: "ring-slate-500/10 dark:ring-slate-400/20" },
}

interface InvoiceRow {
  id: string
  invoiceNumber: string
  contactName: string
  date: string
  dueDate: string
  status: string
  total: number
  [key: string]: unknown
}

const columns: Column<InvoiceRow>[] = [
  {
    key: "invoiceNumber",
    label: "Invoice #",
    sortable: true,
    render: (row) => (
      <Link
        href={`/invoices/${row.id}`}
        className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
      >
        {row.invoiceNumber}
      </Link>
    ),
  },
  {
    key: "contactName",
    label: "Contact",
    sortable: true,
    render: (row) => (
      <span className="text-slate-700 dark:text-slate-300 font-medium">{row.contactName}</span>
    ),
  },
  {
    key: "date",
    label: "Date",
    sortable: true,
    render: (row) => (
      <span className="text-slate-600 dark:text-slate-400 tabular-nums">
        {new Date(row.date).toLocaleDateString("en-AU")}
      </span>
    ),
  },
  {
    key: "dueDate",
    label: "Due Date",
    sortable: true,
    render: (row) => (
      <span className="text-slate-600 dark:text-slate-400 tabular-nums">
        {new Date(row.dueDate).toLocaleDateString("en-AU")}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => {
      const config = statusConfig[row.status] || statusConfig.Draft
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${config.bg} ${config.text} ${config.ring}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
          {row.status}
        </span>
      )
    },
  },
  {
    key: "total",
    label: "Total",
    sortable: true,
    align: "right",
    render: (row) => (
      <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
        ${row.total.toLocaleString("en-AU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    ),
  },
]

interface InvoicesTableProps {
  invoices: InvoiceRow[]
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  return (
    <DataTable
      columns={columns}
      data={invoices}
      pagination={{ defaultPageSize: 10 }}
      emptyIcon={<FileText className="h-6 w-6" />}
      emptyTitle="No invoices yet"
      emptyDescription="Create your first invoice to start tracking revenue."
    />
  )
}
