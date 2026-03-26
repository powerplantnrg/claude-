import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ExpenseClaimActions } from "./claim-actions"

const statusBadge: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Submitted: "bg-blue-100 text-blue-700",
  Approved: "bg-green-100 text-green-700",
  Paid: "bg-indigo-100 text-indigo-700",
  Rejected: "bg-red-100 text-red-700",
}

const categoryLabel: Record<string, string> = {
  travel: "Travel",
  meals: "Meals",
  supplies: "Supplies",
  software: "Software",
  equipment: "Equipment",
  other: "Other",
}

export default async function ExpenseClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id } = await params

  const claim = await prisma.expenseClaim.findFirst({
    where: { id, organizationId: orgId },
    include: {
      user: { select: { name: true, email: true } },
      items: {
        include: {
          rdProject: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!claim) notFound()

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {claim.claimNumber}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                statusBadge[claim.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {claim.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Expense claim by {claim.user.name || claim.user.email}
          </p>
        </div>
        <Link
          href="/expenses"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Back to Claims
        </Link>
      </div>

      {/* Claim details card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Employee
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {claim.user.name || claim.user.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Date
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {new Date(claim.date).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Items
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {claim.items.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Amount
            </dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">
              ${fmt(claim.totalAmount)}
            </dd>
          </div>
        </div>
        {claim.notes && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Notes
            </dt>
            <dd className="mt-1 text-sm text-slate-700">{claim.notes}</dd>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Expense Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  GST
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Receipt
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  R&D Project
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claim.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {new Date(item.date).toLocaleDateString("en-AU")}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-900">
                    {item.description}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {categoryLabel[item.category] || item.category}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                    ${fmt(item.amount)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-slate-600">
                    ${fmt(item.taxAmount)}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {item.receiptPath ? (
                      <span className="text-green-600 font-medium text-xs">Attached</span>
                    ) : (
                      <span className="text-slate-400 text-xs">None</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {item.rdProject ? (
                      <Link
                        href={`/rd/projects/${item.rdProject.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        {item.rdProject.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Totals row */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="ml-auto max-w-xs space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium text-slate-900">
                ${fmt(claim.items.reduce((s, i) => s + i.amount, 0))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">GST</span>
              <span className="font-medium text-slate-900">
                ${fmt(claim.items.reduce((s, i) => s + i.taxAmount, 0))}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-1.5 flex justify-between">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">
                ${fmt(claim.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status actions */}
      <ExpenseClaimActions claimId={claim.id} status={claim.status} />
    </div>
  )
}
