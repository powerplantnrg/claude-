import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

function getRiskBadge(rating: "Green" | "Amber" | "Red") {
  const styles = {
    Green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Amber: "bg-amber-50 text-amber-700 border-amber-200",
    Red: "bg-red-50 text-red-700 border-red-200",
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[rating]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          rating === "Green"
            ? "bg-emerald-500"
            : rating === "Amber"
              ? "bg-amber-500"
              : "bg-red-500"
        }`}
      />
      {rating}
    </span>
  )
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    Active: "bg-blue-50 text-blue-700",
    Completed: "bg-emerald-50 text-emerald-700",
    OnHold: "bg-slate-50 text-slate-700",
    Cancelled: "bg-red-50 text-red-700",
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || "bg-slate-50 text-slate-700"}`}
    >
      {status}
    </span>
  )
}

export default async function PortfolioPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const projects = await prisma.rdProject.findMany({
    where: { organizationId: orgId },
    include: {
      portfolioEntry: true,
      rdExpenses: {
        include: {
          journalLine: true,
        },
      },
      activities: {
        include: {
          timeEntries: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const portfolioData = projects.map((project) => {
    const budget = project.budget || 0

    const expenseSpend = project.rdExpenses.reduce(
      (sum, exp) => sum + (exp.journalLine.debit || 0),
      0
    )

    const timeSpend = project.activities.reduce((actSum, act) => {
      return (
        actSum +
        act.timeEntries.reduce(
          (teSum, te) => teSum + te.hours * (te.hourlyRate || 0),
          0
        )
      )
    }, 0)

    const actualSpend =
      project.portfolioEntry?.actualSpend ?? expenseSpend + timeSpend
    const burnRate = budget > 0 ? (actualSpend / budget) * 100 : 0
    const probabilityOfSuccess =
      project.portfolioEntry?.probabilityOfSuccess ?? null
    const expectedROI = project.portfolioEntry?.expectedROI ?? null
    const capitalAllocated = project.portfolioEntry?.capitalAllocated ?? budget

    let riskRating: "Green" | "Amber" | "Red" = "Green"
    if (
      burnRate > 100 ||
      (probabilityOfSuccess !== null && probabilityOfSuccess < 0.3)
    ) {
      riskRating = "Red"
    } else if (
      burnRate > 80 ||
      (probabilityOfSuccess !== null && probabilityOfSuccess < 0.6)
    ) {
      riskRating = "Amber"
    }

    return {
      id: project.id,
      name: project.name,
      status: project.portfolioEntry?.status ?? project.status,
      budget,
      actualSpend,
      burnRate: Math.round(burnRate * 100) / 100,
      probabilityOfSuccess,
      expectedROI,
      capitalAllocated,
      riskRating,
    }
  })

  const activeProjects = portfolioData.filter(
    (p) => p.status === "Active" || p.status === "InProgress"
  )
  const totalPortfolioValue = portfolioData.reduce(
    (sum, p) => sum + p.capitalAllocated,
    0
  )
  const totalCapitalDeployed = portfolioData.reduce(
    (sum, p) => sum + p.actualSpend,
    0
  )

  const projectsWithROI = portfolioData.filter(
    (p) => p.expectedROI !== null && p.capitalAllocated > 0
  )
  const weightedROI =
    projectsWithROI.length > 0
      ? projectsWithROI.reduce(
          (sum, p) => sum + (p.expectedROI ?? 0) * p.capitalAllocated,
          0
        ) / projectsWithROI.reduce((sum, p) => sum + p.capitalAllocated, 0)
      : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/rd" className="hover:text-indigo-600">
          R&D Intelligence
        </Link>
        <span>/</span>
        <span className="text-slate-700">Portfolio</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          R&D Portfolio ROI
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track budget utilization, success probability, and expected returns
          across your R&D portfolio.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Total Portfolio Value
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalPortfolioValue)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Weighted Expected ROI
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {weightedROI !== null ? `${(weightedROI * 100).toFixed(1)}%` : "N/A"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Total Capital Deployed
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalCapitalDeployed)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Active Projects
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {activeProjects.length}
          </p>
        </div>
      </div>

      {/* Portfolio Table */}
      {portfolioData.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Project Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">
                    Budget
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">
                    Actual Spend
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">
                    Burn Rate (%)
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">
                    Prob. of Success
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">
                    Expected ROI
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">
                    Risk Rating
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolioData.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/rd/projects/${project.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(project.status)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {project.budget > 0
                        ? formatCurrency(project.budget)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatCurrency(project.actualSpend)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${
                          project.burnRate > 100
                            ? "text-red-600"
                            : project.burnRate > 80
                              ? "text-amber-600"
                              : "text-slate-700"
                        }`}
                      >
                        {project.budget > 0
                          ? `${project.burnRate.toFixed(1)}%`
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {project.probabilityOfSuccess !== null
                        ? `${(project.probabilityOfSuccess * 100).toFixed(0)}%`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {project.expectedROI !== null
                        ? `${(project.expectedROI * 100).toFixed(1)}%`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getRiskBadge(project.riskRating)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
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
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
          <p className="mt-2 text-sm text-slate-500">
            No R&D projects yet. Create projects to see portfolio data here.
          </p>
          <Link
            href="/rd/projects"
            className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Go to Projects
          </Link>
        </div>
      )}
    </div>
  )
}
