import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { ExperimentEditor } from "./experiment-editor"

const statusColor: Record<string, string> = {
  Planned: "bg-slate-100 text-slate-700",
  InProgress: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-500",
}

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id } = await params

  const experiment = await prisma.experiment.findFirst({
    where: {
      id,
      rdActivity: { rdProject: { organizationId: orgId } },
    },
    include: {
      rdActivity: {
        include: {
          rdProject: { select: { id: true, name: true } },
        },
      },
      resources: true,
      outcomes: { orderBy: { recordedAt: "desc" } },
    },
  })

  if (!experiment) notFound()

  const totalResourceCost = experiment.resources.reduce(
    (sum, r) => sum + r.cost,
    0
  )

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

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
          href={`/rd/projects/${experiment.rdActivity.rdProject.id}`}
          className="hover:text-indigo-600"
        >
          {experiment.rdActivity.rdProject.name}
        </Link>
        <span>/</span>
        <Link href="/rd/experiments" className="hover:text-indigo-600">
          Experiments
        </Link>
        <span>/</span>
        <span className="text-slate-700">{experiment.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            {experiment.name}
          </h1>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              statusColor[experiment.status] || "bg-slate-100 text-slate-700"
            }`}
          >
            {experiment.status}
          </span>
          <span className="text-sm text-slate-500">
            Iteration #{experiment.iterationNumber}
          </span>
        </div>
        <Link
          href="/rd/experiments"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Back to Experiments
        </Link>
      </div>

      {/* Experiment Info Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Activity
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              <Link
                href={`/rd/projects/${experiment.rdActivity.rdProject.id}/activities/${experiment.rdActivityId}`}
                className="text-indigo-600 hover:text-indigo-800"
              >
                {experiment.rdActivity.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Start Date
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {experiment.startDate
                ? formatDate(experiment.startDate)
                : "\u2014"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              End Date
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {experiment.endDate
                ? formatDate(experiment.endDate)
                : "\u2014"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Resource Cost
            </dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">
              ${fmt(totalResourceCost)}
            </dd>
          </div>
        </div>
        {experiment.hypothesis && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Hypothesis
            </dt>
            <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
              {experiment.hypothesis}
            </dd>
          </div>
        )}
        {experiment.outcome && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Outcome
            </dt>
            <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
              {experiment.outcome}
            </dd>
          </div>
        )}
      </div>

      {/* Edit form (client component) */}
      <ExperimentEditor
        experimentId={id}
        initialData={{
          name: experiment.name,
          hypothesis: experiment.hypothesis || "",
          status: experiment.status,
          outcome: experiment.outcome || "",
          iterationNumber: experiment.iterationNumber,
          startDate: experiment.startDate
            ? new Date(experiment.startDate).toISOString().split("T")[0]
            : "",
          endDate: experiment.endDate
            ? new Date(experiment.endDate).toISOString().split("T")[0]
            : "",
        }}
      />

      {/* Resources Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Resources ({experiment.resources.length})
          </h2>
          <div className="text-sm font-medium text-slate-700">
            Total: ${fmt(totalResourceCost)}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium text-right">Quantity</th>
                <th className="px-6 py-3 font-medium">Unit</th>
                <th className="px-6 py-3 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {experiment.resources.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No resources recorded.
                  </td>
                </tr>
              ) : (
                experiment.resources.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">
                      {res.resourceType}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {res.description}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-slate-600">
                      {res.quantity != null ? res.quantity : "\u2014"}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {res.unit || "\u2014"}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                      ${fmt(res.cost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outcomes Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Outcomes ({experiment.outcomes.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Notes</th>
                <th className="px-6 py-3 font-medium">Metrics</th>
                <th className="px-6 py-3 font-medium">Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {experiment.outcomes.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No outcomes recorded.
                  </td>
                </tr>
              ) : (
                experiment.outcomes.map((out) => {
                  let metricsDisplay = "\u2014"
                  if (out.metricsJson) {
                    try {
                      const metrics = JSON.parse(out.metricsJson)
                      metricsDisplay = Object.entries(metrics)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")
                    } catch {
                      metricsDisplay = out.metricsJson
                    }
                  }
                  return (
                    <tr key={out.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm font-medium text-slate-900">
                        {out.outcomeType}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {out.notes || "\u2014"}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {metricsDisplay}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {formatDate(out.recordedAt)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
