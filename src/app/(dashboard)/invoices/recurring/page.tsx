import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"
import { RecurringForm } from "./recurring-form"

export const metadata: Metadata = {
  title: "Recurring Invoices",
}

export default async function RecurringInvoicesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const recurringInvoices = await prisma.recurringInvoice.findMany({
    where: { organizationId: orgId },
    include: { contact: { select: { name: true } } },
    orderBy: { nextDate: "asc" },
  })

  const contacts = await prisma.contact.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const accounts = await prisma.account.findMany({
    where: { organizationId: orgId, type: "Revenue", isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  })

  const frequencyLabels: Record<string, string> = {
    weekly: "Weekly",
    fortnightly: "Fortnightly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    annually: "Annually",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recurring Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage recurring invoice templates for automated billing
          </p>
        </div>
        <Link
          href="/invoices"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Back to Invoices
        </Link>
      </div>

      <RecurringForm contacts={contacts} accounts={accounts} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Frequency
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Next Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Generated
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Template Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recurringInvoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                  No recurring invoices configured yet. Create your first template above.
                </td>
              </tr>
            )}
            {recurringInvoices.map((ri) => {
              let templateTotal = 0
              try {
                const template = JSON.parse(ri.templateData)
                if (template.lines) {
                  templateTotal = template.lines.reduce(
                    (sum: number, line: { quantity: number; unitPrice: number }) =>
                      sum + line.quantity * line.unitPrice,
                    0
                  )
                }
              } catch {
                // ignore parse errors
              }

              return (
                <tr key={ri.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {ri.contact.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {frequencyLabels[ri.frequency] || ri.frequency}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {new Date(ri.nextDate).toLocaleDateString("en-AU")}
                  </td>
                  <td className="px-6 py-4">
                    {ri.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        Paused
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-slate-700">
                    {ri.invoiceCount}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-slate-900">
                    ${templateTotal.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
