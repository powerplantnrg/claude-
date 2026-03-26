"use client"

import Link from "next/link"
import { DataTable, Column } from "@/components/ui/data-table"

interface AccountRow {
  id: string
  code: string
  name: string
  type: string
  subType: string | null
  taxType: string | null
  isActive: boolean
  isRdEligible: boolean
  [key: string]: unknown
}

const columns: Column<AccountRow>[] = [
  {
    key: "code",
    label: "Code",
    sortable: true,
    render: (row) => (
      <span className="whitespace-nowrap font-mono font-medium text-slate-900">
        {row.code}
      </span>
    ),
  },
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (row) => (
      <span className="text-slate-700">{row.name}</span>
    ),
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (row) => (
      <span className="text-slate-700">{row.type}</span>
    ),
  },
  {
    key: "subType",
    label: "Sub Type",
    sortable: true,
    render: (row) => (
      <span className="whitespace-nowrap text-slate-500">
        {row.subType ?? "\u2014"}
      </span>
    ),
  },
  {
    key: "taxType",
    label: "Tax Type",
    sortable: false,
    render: (row) => (
      <span className="whitespace-nowrap text-slate-500">
        {row.taxType ?? "\u2014"}
      </span>
    ),
  },
  {
    key: "isActive",
    label: "Status",
    sortable: true,
    render: (row) =>
      row.isActive ? (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Active
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          Inactive
        </span>
      ),
  },
  {
    key: "isRdEligible",
    label: "R&D",
    sortable: false,
    render: (row) =>
      row.isRdEligible ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs font-medium text-violet-700">
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
          R&D Eligible
        </span>
      ) : null,
  },
  {
    key: "actions",
    label: "Actions",
    sortable: false,
    render: (row) => (
      <div className="flex items-center gap-2">
        <Link
          href={`/accounts/${row.id}/edit`}
          className="inline-flex items-center rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          Edit
        </Link>
        <Link
          href={`/accounts/${row.id}/reconciliation`}
          className="inline-flex items-center rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Ledger
        </Link>
      </div>
    ),
  },
]

interface AccountsTableProps {
  accounts: AccountRow[]
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-slate-400">
        No accounts in this category.
      </div>
    )
  }

  return <DataTable columns={columns} data={accounts} pagination={{ defaultPageSize: 25 }} />
}
