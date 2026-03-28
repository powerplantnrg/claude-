import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Budgets",
}

export default async function BudgetsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const budgets = await prisma.budget.findMany({
    where: { organizationId: orgId },
    include: {
      items: { select: { total: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const budgetsWithTotals = budgets.map((b) => ({
    ...b,
    totalBudget: b.items.reduce((sum, item) => sum + item.total, 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Budgets</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage budgets for your organisation
          </p>
        </div>
        <Link
          href="/budgets/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
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
          New Budget
        </Link>
      </div>

      {budgetsWithTotals.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
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
              d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-900">
            No budgets yet
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Create your first budget to start tracking spending against targets.
          </p>
          <Link
            href="/budgets/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Create Budget
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Financial Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Budget
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetsWithTotals.map((budget) => (
                <tr key={budget.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                    {budget.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    FY {budget.financialYear}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        budget.status === "Active"
                          ? "bg-green-50 text-green-700"
                          : budget.status === "Closed"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {budget.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-slate-900">
                    {formatCurrency(budget.totalBudget)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <Link
                      href={`/budgets/${budget.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
