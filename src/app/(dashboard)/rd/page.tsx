import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import type { Metadata } from "next"
import {
  RdSpendByProjectChart,
  ExperimentStatusChart,
} from "@/components/charts/rd-charts"
import { generateRecommendations } from "@/lib/rd-recommendations"

export const metadata: Metadata = {
  title: "R&D Intelligence",
}

export default async function RdDashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const [projects, experiments, rdSpend, claimDrafts, recommendations] = await Promise.all([
    prisma.rdProject.findMany({
      where: { organizationId: orgId },
      include: {
        activities: {
          include: {
            experiments: true,
          },
        },
        rdExpenses: {
          include: {
            journalLine: true,
          },
        },
        complianceChecklist: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.experiment.findMany({
      where: {
        rdActivity: {
          rdProject: { organizationId: orgId },
        },
      },
      include: {
        rdActivity: {
          include: { rdProject: true },
        },
        resources: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.journalLine.aggregate({
      _sum: { debit: true },
      where: {
        journalEntry: {
          organizationId: orgId,
          status: "Posted",
        },
        account: {
          type: "Expense",
          isRdEligible: true,
        },
      },
    }),
    prisma.rdClaimDraft.findMany({
      where: {
        rdProject: { organizationId: orgId },
      },
      orderBy: { generatedAt: "desc" },
      take: 1,
    }),
    generateRecommendations({ organizationId: orgId }),
  ])

  const totalRdSpend = rdSpend._sum.debit || 0
  const activeProjects = projects.filter((p) => p.status === "Active").length
  const allExperiments = projects.flatMap((p) =>
    p.activities.flatMap((a) => a.experiments)
  )
  const activeExperiments = allExperiments.filter(
    (e) => e.status === "Running" || e.status === "Planned"
  ).length

  // Estimate tax offset at 43.5% for aggregated turnover < $20M, else 38.5%
  const offsetRate = 0.435
  const estimatedTaxOffset = totalRdSpend * offsetRate

  const statusColor: Record<string, string> = {
    Planned: "bg-slate-100 text-slate-700",
    Running: "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    Failed: "bg-red-100 text-red-700",
  }

  const eligibilityColor: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700",
    Eligible: "bg-green-100 text-green-700",
    Ineligible: "bg-red-100 text-red-700",
    PartiallyEligible: "bg-blue-100 text-blue-700",
  }

  // Chart data: R&D spend by project
  const projectSpendData = projects
    .map((project) => ({
      name: project.name,
      spend: project.rdExpenses.reduce(
        (sum, e) => sum + (e.journalLine?.debit || 0),
        0
      ),
    }))
    .filter((d) => d.spend > 0)
    .sort((a, b) => b.spend - a.spend)

  // Chart data: experiment status distribution
  const statusCounts = new Map<string, number>()
  for (const exp of allExperiments) {
    statusCounts.set(exp.status, (statusCounts.get(exp.status) || 0) + 1)
  }
  const experimentStatusData = Array.from(statusCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            R&D Intelligence
          </h1>
          <p className="text-sm text-slate-500">
            Track R&D projects, experiments, and tax incentive eligibility
          </p>
        </div>
        <Link
          href="/rd/projects/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New Project
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total R&D Spend
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(totalRdSpend)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Active Projects
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {activeProjects}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <svg className="h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Active Experiments
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {activeExperiments}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l4.5-4.5m0 0l4.5 4.5M13.5 9.75V21m0 0H6.75a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 016.75 4.5h10.5A2.25 2.25 0 0119.5 6.75v5.25" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Est. Tax Offset
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(estimatedTaxOffset)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RdSpendByProjectChart data={projectSpendData} />
        <ExperimentStatusChart data={experimentStatusData} />
      </div>

      {/* Projects Overview Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Projects Overview
          </h2>
          <Link
            href="/rd/projects"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-left text-sm text-slate-500">
                <th className="px-6 py-3 font-medium">Project Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Eligibility</th>
                <th className="px-6 py-3 font-medium text-right">
                  Spend to Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No R&D projects yet.{" "}
                    <Link
                      href="/rd/projects/new"
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      Create your first project
                    </Link>
                  </td>
                </tr>
              ) : (
                projects.slice(0, 5).map((project) => {
                  const projectSpend = project.rdExpenses.reduce(
                    (sum, e) => sum + (e.journalLine?.debit || 0),
                    0
                  )
                  return (
                    <tr key={project.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/rd/projects/${project.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            eligibilityColor[project.eligibilityStatus] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {project.eligibilityStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-700">
                        {formatCurrency(projectSpend)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Top Recommendations
            </h2>
            <Link
              href="/rd/recommendations"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View All ({recommendations.length})
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recommendations.slice(0, 3).map((rec) => {
              const priorityBadge =
                rec.priority === "high"
                  ? "bg-red-100 text-red-700"
                  : rec.priority === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
              return (
                <div
                  key={rec.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge}`}
                      >
                        {rec.priority}
                      </span>
                      <span className="text-xs text-slate-400">
                        {rec.category}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900">{rec.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500 truncate">
                      {rec.description}
                    </p>
                  </div>
                  <Link
                    href={rec.actionUrl}
                    className="ml-4 shrink-0 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                  >
                    Take Action
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Experiments */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Experiments
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {experiments.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              No experiments recorded yet.
            </div>
          ) : (
            experiments.slice(0, 5).map((experiment) => (
              <div
                key={experiment.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {experiment.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {experiment.rdActivity.rdProject.name} &middot;{" "}
                    {experiment.rdActivity.name}
                  </p>
                  {experiment.hypothesis && (
                    <p className="mt-1 truncate text-sm text-slate-400">
                      {experiment.hypothesis}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    Iter #{experiment.iterationNumber}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusColor[experiment.status] ||
                      "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {experiment.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
