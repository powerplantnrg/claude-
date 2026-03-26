import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ContactsTable } from "@/components/tables/contacts-table"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contacts",
}

const CONTACT_TYPE_COLORS: Record<string, string> = {
  Customer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Supplier: "bg-blue-50 text-blue-700 border-blue-200",
  Both: "bg-violet-50 text-violet-700 border-violet-200",
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; tag?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const params = await searchParams
  const search = params.search ?? ""
  const typeFilter = params.type ?? ""
  const tagFilter = params.tag ?? ""

  const where: Record<string, unknown> = { organizationId: orgId }

  if (typeFilter && ["Customer", "Supplier", "Both"].includes(typeFilter)) {
    where.contactType = typeFilter
  }

  if (tagFilter) {
    where.tagAssignments = {
      some: { tag: { name: tagFilter, organizationId: orgId } },
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { abn: { contains: search } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      tagAssignments: {
        include: { tag: true },
      },
    },
    orderBy: { name: "asc" },
  })

  // Fetch all tags for the filter dropdown
  const allTags = await prisma.contactTag.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
  })

  const contactCounts = await prisma.contact.groupBy({
    by: ["contactType"],
    where: { organizationId: orgId },
    _count: true,
  })

  const countMap: Record<string, number> = {}
  contactCounts.forEach((c) => {
    countMap[c.contactType] = c._count
  })

  const totalContacts = contacts.length
  const rdContractors = contacts.filter((c) => c.isRdContractor).length

  const tableData = contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    email: contact.email,
    contactType: contact.contactType,
    abn: contact.abn,
    phone: contact.phone,
    isRdContractor: contact.isRdContractor,
    createdAt: contact.createdAt.toISOString(),
    tags: contact.tagAssignments.map((ta) => ({
      id: ta.tag.id,
      name: ta.tag.name,
      color: ta.tag.color,
    })),
  }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contacts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage customers, suppliers, and R&D contractors
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Contact
        </Link>
      </div>

      {/* Summary Badges */}
      <div className="flex flex-wrap gap-3">
        {["Customer", "Supplier", "Both"].map((type) => {
          const colors = CONTACT_TYPE_COLORS[type] ?? ""
          return (
            <div
              key={type}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${colors}`}
            >
              {type === "Both" ? "Customer & Supplier" : `${type}s`}
              <span className="font-bold">{countMap[type] ?? 0}</span>
            </div>
          )
        })}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
          R&D Contractors
          <span className="font-bold">{rdContractors}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          Total
          <span className="font-bold">{totalContacts}</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form className="flex flex-1 gap-3" method="GET">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by name, email, or ABN..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            name="type"
            defaultValue={typeFilter}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            <option value="Customer">Customers</option>
            <option value="Supplier">Suppliers</option>
            <option value="Both">Both</option>
          </select>
          {allTags.length > 0 && (
            <select
              name="tag"
              defaultValue={tagFilter}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag.id} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            Filter
          </button>
          {(search || typeFilter || tagFilter) && (
            <Link
              href="/contacts"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Contacts Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ContactsTable contacts={tableData} hasFilters={!!(search || typeFilter || tagFilter)} />
      </div>
    </div>
  )
}
