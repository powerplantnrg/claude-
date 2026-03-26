import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

const CONTACT_TYPE_COLORS: Record<string, string> = {
  Customer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Supplier: "bg-blue-50 text-blue-700 border-blue-200",
  Both: "bg-violet-50 text-violet-700 border-violet-200",
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const params = await searchParams
  const search = params.search ?? ""
  const typeFilter = params.type ?? ""

  const where: Record<string, unknown> = { organizationId: orgId }

  if (typeFilter && ["Customer", "Supplier", "Both"].includes(typeFilter)) {
    where.contactType = typeFilter
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
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            Filter
          </button>
          {(search || typeFilter) && (
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">ABN</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">R&D</th>
                <th className="px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {contacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    {search || typeFilter ? (
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
                        <svg
                          className="mx-auto h-12 w-12 text-slate-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                          />
                        </svg>
                        <p className="mt-4 font-medium text-slate-500">
                          No contacts yet
                        </p>
                        <p className="mt-1">
                          Get started by adding your first contact.
                        </p>
                        <div className="mt-4">
                          <Link
                            href="/contacts/new"
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
                          >
                            Add Contact
                          </Link>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const typeColor =
                    CONTACT_TYPE_COLORS[contact.contactType] ??
                    "bg-slate-100 text-slate-600"
                  return (
                    <tr
                      key={contact.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-slate-900">
                        {contact.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-500">
                        {contact.email ?? "\u2014"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeColor}`}
                        >
                          {contact.contactType === "Both"
                            ? "Customer & Supplier"
                            : contact.contactType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm font-mono text-slate-500">
                        {contact.abn ?? "\u2014"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-500">
                        {contact.phone ?? "\u2014"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        {contact.isRdContractor && (
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
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-500">
                        {formatDate(contact.createdAt)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
