import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  calculateRdClaim,
  generateClaimBreakdown,
} from "@/lib/claim-calculator"
import { ClaimActions } from "./claim-actions"

export default async function ClaimsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  })

  // Get all R&D eligible expenses
  const rdExpenses = await prisma.rdExpense.findMany({
    where: {
      rdProject: { organizationId: orgId },
    },
    include: {
      journalLine: {
        include: {
          account: true,
          journalEntry: true,
        },
      },
      rdProject: true,
    },
  })

  // Calculate totals
  const expenses = rdExpenses
    .filter((e) => e.journalLine.journalEntry.status === "Posted")
    .map((e) => ({
      category: e.category,
      amount: e.journalLine.debit,
    }))

  const breakdown = generateClaimBreakdown(expenses)
  const turnover = org?.aggregatedTurnover ?? 0
  const claimResult = calculateRdClaim(breakdown.totalEligible, turnover)

  // Get previous claim drafts
  const claimDrafts = await prisma.rdClaimDraft.findMany({
    where: {
      rdProject: { organizationId: orgId },
    },
    include: {
      rdProject: true,
    },
    orderBy: { generatedAt: "desc" },
  })

  // Determine current FY
  const fyEnd = org?.financialYearEnd ?? 6
  const now = new Date()
  const fyYear =
    now.getMonth() + 1 > fyEnd ? now.getFullYear() + 1 : now.getFullYear()
  const financialYear = `FY${fyYear - 1}-${String(fyYear).slice(2)}`

  const statusColors: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-700",
    Submitted: "bg-blue-100 text-blue-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          R&D Tax Incentive Claims
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Calculate and manage your R&D Tax Incentive claims under the Australian scheme
        </p>
      </div>

      {/* Current FY Estimate */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              Current Financial Year
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {financialYear} Claim Estimate
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              turnover < 20_000_000
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {turnover < 20_000_000
              ? "Refundable (43.5%)"
              : "Non-refundable (38.5%)"}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Total Eligible Expenditure</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(breakdown.totalEligible)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Offset Rate</p>
            <p className="mt-1 text-2xl font-bold text-indigo-600">
              {(claimResult.offsetRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Estimated Offset</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(claimResult.estimatedOffset)}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown by Category */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Breakdown by Category
          </h2>
        </div>
        {breakdown.items.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No eligible R&D expenses recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {breakdown.items.map((item) => (
              <div
                key={item.category}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-600">
                    {item.percentage.toFixed(0)}%
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-32">
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-28 text-right text-sm font-medium text-slate-900">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Claim / Actions */}
      <ClaimActions financialYear={financialYear} />

      {/* Previous Claim Drafts */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Previous Claim Drafts
          </h2>
        </div>
        {claimDrafts.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No claim drafts generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-sm text-slate-500">
                  <th className="px-6 py-3 font-medium">Financial Year</th>
                  <th className="px-6 py-3 font-medium">Project</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">
                    Eligible Expenditure
                  </th>
                  <th className="px-6 py-3 font-medium text-right">
                    Est. Offset
                  </th>
                  <th className="px-6 py-3 font-medium">Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claimDrafts.map((draft) => (
                  <tr key={draft.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {draft.financialYear}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {draft.rdProject?.name ?? "All Projects"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusColors[draft.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {draft.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">
                      {formatCurrency(draft.totalEligibleExpenditure)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                      {formatCurrency(draft.estimatedOffset)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(draft.generatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
