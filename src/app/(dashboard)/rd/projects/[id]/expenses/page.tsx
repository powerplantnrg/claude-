import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id } = await params

  const project = await prisma.rdProject.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!project) notFound()

  const expenses = await prisma.rdExpense.findMany({
    where: { rdProjectId: id },
    include: {
      journalLine: {
        include: {
          account: true,
          journalEntry: true,
        },
      },
      rdActivity: {
        select: { id: true, name: true },
      },
    },
    orderBy: { journalLine: { journalEntry: { date: "desc" } } },
  })

  const classificationColor: Record<string, string> = {
    CoreRD: "bg-green-100 text-green-700",
    SupportingRD: "bg-blue-100 text-blue-700",
    NonEligible: "bg-slate-100 text-slate-500",
    NeedsReview: "bg-amber-100 text-amber-700",
  }

  const classificationLabel: Record<string, string> = {
    CoreRD: "Core R&D",
    SupportingRD: "Supporting R&D",
    NonEligible: "Non-Eligible",
    NeedsReview: "Needs Review",
  }

  // Summary by classification
  const summaryByClass: Record<string, { count: number; total: number }> = {}
  expenses.forEach((e) => {
    const cls = e.classification
    if (!summaryByClass[cls]) summaryByClass[cls] = { count: 0, total: 0 }
    summaryByClass[cls].count++
    summaryByClass[cls].total += e.journalLine?.debit || 0
  })

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (e.journalLine?.debit || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/rd" className="hover:text-indigo-600">
          R&D Intelligence
        </Link>
        <span>/</span>
        <Link href="/rd/projects" className="hover:text-indigo-600">
          Projects
        </Link>
        <span>/</span>
        <Link
          href={`/rd/projects/${id}`}
          className="hover:text-indigo-600"
        >
          {project.name}
        </Link>
        <span>/</span>
        <span className="text-slate-700">Expenses</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">R&D Expenses</h1>
        <p className="text-sm text-slate-500">
          Expenses allocated to {project.name}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(["CoreRD", "SupportingRD", "NeedsReview", "NonEligible"] as const).map(
          (cls) => (
            <div
              key={cls}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${classificationColor[cls]}`}
                >
                  {classificationLabel[cls]}
                </span>
              </div>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatCurrency(summaryByClass[cls]?.total || 0)}
              </p>
              <p className="text-xs text-slate-400">
                {summaryByClass[cls]?.count || 0} items
              </p>
            </div>
          )
        )}
      </div>

      {/* Total */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-indigo-600">
            Total R&D Expenses
          </p>
          <p className="text-2xl font-bold text-indigo-700">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Account</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Activity</th>
                <th className="px-6 py-3 font-medium">Classification</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No expenses allocated to this project yet. Expenses are
                    linked via journal entries with R&D project tags.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-700">
                      {expense.journalLine?.journalEntry
                        ? formatDate(expense.journalLine.journalEntry.date)
                        : "\u2014"}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700">
                      {expense.journalLine?.account?.name || "\u2014"}
                    </td>
                    <td className="max-w-xs truncate px-6 py-3 text-sm text-slate-600">
                      {expense.journalLine?.description || "\u2014"}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">
                      {expense.rdActivity?.name || "\u2014"}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          classificationColor[expense.classification] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {classificationLabel[expense.classification] ||
                          expense.classification}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">
                      {expense.category}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(expense.journalLine?.debit || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
