import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Credit Notes",
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const statusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Approved: "bg-blue-100 text-blue-700",
  Applied: "bg-emerald-100 text-emerald-700",
  Void: "bg-red-100 text-red-700",
}

export default async function CreditNotesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const creditNotes = await prisma.creditNote.findMany({
    where: { organizationId: orgId },
    include: {
      contact: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Credit Notes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage credit notes issued to contacts
          </p>
        </div>
        <Link
          href="/invoices/credit-notes/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Credit Note
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {creditNotes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                  No credit notes yet. Create one to get started.
                </td>
              </tr>
            ) : (
              creditNotes.map((cn) => (
                <tr key={cn.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">
                    {cn.creditNoteNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">{cn.contact.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(cn.date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        statusColors[cn.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {cn.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                    {formatCurrency(cn.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
