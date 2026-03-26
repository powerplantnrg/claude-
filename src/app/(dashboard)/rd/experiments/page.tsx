import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function AllExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; project?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const params = await searchParams
  const statusFilter = params.status || ""
  const projectFilter = params.project || ""

  const where: any = {
    rdActivity: { rdProject: { organizationId: orgId } },
  }
  if (statusFilter) where.status = statusFilter
  if (projectFilter) where.rdActivity = { ...where.rdActivity, rdProjectId: projectFilter }

  const experiments = await prisma.experiment.findMany({
    where,
    include: {
      rdActivity: {
        include: {
          rdProject: { select: { id: true, name: true } },
        },
      },
      resources: true,
      outcomes: true,
      pipelineStage: true,
    },
    orderBy: { updatedAt: "desc" },
  })

  const projects = await prisma.rdProject.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const statusColor: Record<string, string> = {
    Planned: "bg-slate-100 text-slate-700",
    Running: "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    Failed: "bg-red-100 text-red-700",
  }

  const statusDot: Record<string, string> = {
    Planned: "bg-slate-400",
    Running: "bg-blue-500",
    Completed: "bg-green-500",
    Failed: "bg-red-500",
  }

  // Summary stats
  const total = experiments.length
  const running = experiments.filter((e) => e.status === "Running").length
  const completed = experiments.filter((e) => e.status === "Completed").length
  const totalResourceCost = experiments.reduce(
    (sum, e) => sum + e.resources.reduce((s, r) => s + r.cost, 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/rd" className="hover:text-indigo-600">R&D Intelligence</Link>
        <span>/</span>
        <span className="text-slate-700">Experiments</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">All Experiments</h1>
          <p className="mt-1 text-sm text-slate-500">
            View and filter experiments across all R&D projects
          </p>
        </div>
        <Link
          href="/rd/pipeline"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Pipeline View
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-blue-600">Running</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{running}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-green-600">Completed</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{completed}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-indigo-600">Resource Cost</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{formatCurrency(totalResourceCost)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form className="flex flex-1 gap-3" method="GET">
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="Running">Running</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </select>
          <select
            name="project"
            defaultValue={projectFilter}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Filter
          </button>
          {(statusFilter || projectFilter) && (
            <Link
              href="/rd/experiments"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Experiment Cards */}
      {experiments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">
            {statusFilter || projectFilter ? "No experiments match your filters" : "No experiments yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {experiments.map((experiment) => {
            const resourceCost = experiment.resources.reduce((sum, r) => sum + r.cost, 0)
            return (
              <div
                key={experiment.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">{experiment.name}</h3>
                    <Link
                      href={`/rd/projects/${experiment.rdActivity.rdProject.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      {experiment.rdActivity.rdProject.name}
                    </Link>
                    <p className="text-xs text-slate-400">{experiment.rdActivity.name}</p>
                  </div>
                  <div className="ml-2 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${statusDot[experiment.status] || "bg-slate-400"}`} />
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[experiment.status] || "bg-slate-100 text-slate-700"}`}>
                      {experiment.status}
                    </span>
                  </div>
                </div>

                {experiment.hypothesis && (
                  <p className="mb-3 text-sm text-slate-600 line-clamp-2">{experiment.hypothesis}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Iteration <span className="font-medium text-slate-700">#{experiment.iterationNumber}</span></span>
                  {resourceCost > 0 && (
                    <span>Cost: <span className="font-medium text-slate-700">{formatCurrency(resourceCost)}</span></span>
                  )}
                  {experiment.outcomes.length > 0 && (
                    <span>{experiment.outcomes.length} outcome{experiment.outcomes.length !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {experiment.pipelineStage && (
                  <div className="mt-2">
                    <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {experiment.pipelineStage.name}
                    </span>
                  </div>
                )}

                {experiment.startDate && (
                  <p className="mt-2 text-xs text-slate-400">
                    Started {formatDate(experiment.startDate)}
                    {experiment.endDate && ` \u2014 ${formatDate(experiment.endDate)}`}
                  </p>
                )}

                {experiment.outcome && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Outcome</p>
                    <p className="mt-0.5 text-sm text-slate-700 line-clamp-2">{experiment.outcome}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
