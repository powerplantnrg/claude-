import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"
import { InvoicesTable } from "@/components/tables/invoices-table"

export const metadata: Metadata = {
  title: "Invoices",
}

export default async function InvoicesPage() {
  const session = await auth()
  if (!session) redirect("/login")
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your sales invoices and track payments
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <InvoicesTable invoices={tableData} />
      </div>
    </div>
  )
}
