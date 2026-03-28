import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { NewExperimentButton } from "./new-experiment-button"

export default async function ExperimentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id } = await params

  const project = await prisma.rdProject.findFirst({
    where: { id, organizationId: orgId },
    include: {
      activities: {
        select: { id: true, name: true },
      },
    },
  })
  if (!project) notFound()

  const experiments = await prisma.experiment.findMany({
    where: {
      rdActivity: { rdProjectId: id },
    },
    include: {
      rdActivity: { select: { id: true, name: true } },
      resources: true,
      outcomes: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const statusColor: Record<string, string> = {
    Planned: "bg-slate-100 text-slate-700 border-slate-200",
    Running: "bg-blue-100 text-blue-700 border-blue-200",
    Completed: "bg-green-100 text-green-700 border-green-200",
    Failed: "bg-red-100 text-red-700 border-red-200",
  }

  const statusDot: Record<string, string> = {
    Planned: "bg-slate-400",
    Running: "bg-blue-500",
    Completed: "bg-green-500",
    Failed: "bg-red-500",
  }

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
        <span className="text-slate-700">Experiments</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Experiments</h1>
          <p className="text-sm text-slate-500">
            Track experiments and iterations for {project.name}
          </p>
        </div>
        <NewExperimentButton activities={project.activities} />
      </div>

      {/* Experiment Cards */}
      {experiments.length === 0 ? (
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
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
          <p className="mt-2 text-sm text-slate-500">
            No experiments yet. Create activities first, then add experiments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {experiments.map((experiment) => {
            const totalResourceCost = experiment.resources.reduce(
              (sum, r) => sum + r.cost,
              0
            )
            return (
              <div
                key={experiment.id}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {experiment.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {experiment.rdActivity.name}
                    </p>
                  </div>
                  <div className="ml-2 flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        statusDot[experiment.status] || "bg-slate-400"
                      }`}
                    />
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColor[experiment.status] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {experiment.status}
                    </span>
                  </div>
                </div>

                {experiment.hypothesis && (
                  <p className="mb-3 text-sm text-slate-600 line-clamp-2">
                    {experiment.hypothesis}
                  </p>
                )}

                <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
                  <span>
                    Iteration{" "}
                    <span className="font-medium text-slate-700">
                      #{experiment.iterationNumber}
                    </span>
                  </span>
                  {experiment.resources.length > 0 && (
                    <span>
                      Resources:{" "}
                      <span className="font-medium text-slate-700">
                        {formatCurrency(totalResourceCost)}
                      </span>
                    </span>
                  )}
                </div>

                {experiment.startDate && (
                  <p className="text-xs text-slate-400">
                    Started {formatDate(experiment.startDate)}
                    {experiment.endDate &&
                      ` \u2014 ${formatDate(experiment.endDate)}`}
                  </p>
                )}

                {experiment.outcome && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      Outcome
                    </p>
                    <p className="mt-0.5 text-sm text-slate-700">
                      {experiment.outcome}
                    </p>
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
