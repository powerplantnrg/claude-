"use client"

import { DataTable, Column } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"

const CONTACT_TYPE_COLORS: Record<string, string> = {
  Customer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Supplier: "bg-blue-50 text-blue-700 border-blue-200",
  Both: "bg-violet-50 text-violet-700 border-violet-200",
}

interface ContactTag {
  id: string
  name: string
  color: string
}

interface ContactRow {
  id: string
  name: string
  email: string | null
  contactType: string
  abn: string | null
  phone: string | null
  isRdContractor: boolean
  createdAt: string
  tags?: ContactTag[]
  [key: string]: unknown
}

const columns: Column<ContactRow>[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (row) => (
      <span className="whitespace-nowrap font-medium text-slate-900">
        {row.name}
      </span>
    ),
  },
  {
    key: "email",
    label: "Email",
    sortable: true,
    render: (row) => (
      <span className="whitespace-nowrap text-slate-500">
        {row.email ?? "\u2014"}
      </span>
    ),
  },
  {
    key: "contactType",
    label: "Type",
    sortable: true,
    render: (row) => {
      const typeColor =
        CONTACT_TYPE_COLORS[row.contactType] ?? "bg-slate-100 text-slate-600"
      return (
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeColor}`}
        >
          {row.contactType === "Both" ? "Customer & Supplier" : row.contactType}
        </span>
      )
    },
  },
  {
    key: "abn",
    label: "ABN",
    sortable: false,
    render: (row) => (
      <span className="whitespace-nowrap font-mono text-slate-500">
        {row.abn ?? "\u2014"}
      </span>
    ),
  },
  {
    key: "phone",
    label: "Phone",
    sortable: false,
    render: (row) => (
      <span className="whitespace-nowrap text-slate-500">
        {row.phone ?? "\u2014"}
      </span>
    ),
  },
  {
    key: "isRdContractor",
    label: "R&D",
    sortable: false,
    render: (row) =>
      row.isRdContractor ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
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
          R&D Contractor
        </span>
      ) : null,
  },
  {
    key: "tags",
    label: "Tags",
    sortable: false,
    render: (row) => {
      const tags = (row.tags ?? []) as ContactTag[]
      if (tags.length === 0) return null
      return (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )
    },
  },
  {
    key: "createdAt",
    label: "Created",
    sortable: true,
    render: (row) => (
      <span className="whitespace-nowrap text-slate-500">
        {formatDate(row.createdAt)}
      </span>
    ),
  },
]

interface ContactsTableProps {
  contacts: ContactRow[]
  hasFilters: boolean
}

export function ContactsTable({ contacts, hasFilters }: ContactsTableProps) {
  if (contacts.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-slate-400">
        {hasFilters ? (
          <div>
            <p className="font-medium text-slate-500">
              No contacts match your filters
            </p>
            <p className="mt-1">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <div>
            <p className="font-medium text-slate-500">No contacts yet</p>
            <p className="mt-1">Get started by adding your first contact.</p>
          </div>
        )}
      </div>
    )
  }

  return <DataTable columns={columns} data={contacts} pagination={{ defaultPageSize: 10 }} />
}
