"use client"

import Link from "next/link"
import { DataTable, Column } from "@/components/ui/data-table"

const statusBadge: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Sent: "bg-blue-100 text-blue-700",
  Paid: "bg-green-100 text-green-700",
  Overdue: "bg-red-100 text-red-700",
  Void: "bg-slate-100 text-slate-500",
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
        className="font-medium text-blue-600 hover:text-blue-800"
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
      <span className="text-slate-700">{row.contactName}</span>
    ),
  },
  {
    key: "date",
    label: "Date",
    sortable: true,
    render: (row) => (
      <span className="text-slate-600">
        {new Date(row.date).toLocaleDateString("en-AU")}
      </span>
    ),
  },
  {
    key: "dueDate",
    label: "Due Date",
    sortable: true,
    render: (row) => (
      <span className="text-slate-600">
        {new Date(row.dueDate).toLocaleDateString("en-AU")}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          statusBadge[row.status] || "bg-gray-100 text-gray-700"
        }`}
      >
        {row.status}
      </span>
    ),
  },
  {
    key: "total",
    label: "Total",
    sortable: true,
    render: (row) => (
      <span className="font-medium text-slate-900 text-right block">
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
  if (invoices.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-slate-400">
        No invoices yet. Create your first invoice to get started.
      </div>
    )
  }

  return <DataTable columns={columns} data={invoices} pagination={{ defaultPageSize: 10 }} />
}
