import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { ActivityDetailEditor } from "./activity-editor"

const activityTypeColor: Record<string, string> = {
  Core: "bg-indigo-100 text-indigo-700",
  Supporting: "bg-sky-100 text-sky-700",
}

const statusColor: Record<string, string> = {
  InProgress: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  NotStarted: "bg-slate-100 text-slate-700",
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string; activityId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id, activityId } = await params

  const project = await prisma.rdProject.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!project) notFound()

  const activity = await prisma.rdActivity.findFirst({
    where: { id: activityId, rdProjectId: id },
    include: {
      experiments: {
        orderBy: { createdAt: "desc" },
        include: { resources: true },
      },
      timeEntries: {
        orderBy: { date: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      evidence: {
        orderBy: { uploadedAt: "desc" },
      },
    },
  })
  if (!activity) notFound()

  const totalHours = activity.timeEntries.reduce((sum, e) => sum + e.hours, 0)
  const totalTimeCost = activity.timeEntries.reduce(
    (sum, e) => sum + e.hours * (e.hourlyRate || 0),
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
        <Link href={`/rd/projects/${id}`} className="hover:text-indigo-600">
          {project.name}
        </Link>
        <span>/</span>
        <Link
          href={`/rd/projects/${id}/activities`}
          className="hover:text-indigo-600"
        >
          Activities
        </Link>
        <span>/</span>
        <span className="text-slate-700">{activity.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{activity.name}</h1>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              activityTypeColor[activity.activityType] ||
              "bg-slate-100 text-slate-700"
            }`}
          >
            {activity.activityType}
          </span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              statusColor[activity.status] || "bg-slate-100 text-slate-700"
            }`}
          >
            {activity.status}
          </span>
        </div>
        <Link
          href={`/rd/projects/${id}/activities`}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Back to Activities
        </Link>
      </div>

      {/* Activity details card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {activity.hypothesis && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Hypothesis
              </dt>
              <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                {activity.hypothesis}
              </dd>
            </div>
          )}
          {activity.methodology && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Methodology
              </dt>
              <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                {activity.methodology}
              </dd>
            </div>
          )}
          {activity.outcome && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Outcome
              </dt>
              <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                {activity.outcome}
              </dd>
            </div>
          )}
          {activity.technicalUncertainty && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Technical Uncertainty
              </dt>
              <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                {activity.technicalUncertainty}
              </dd>
            </div>
          )}
          {activity.newKnowledgeSought && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                New Knowledge Sought
              </dt>
              <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                {activity.newKnowledgeSought}
              </dd>
            </div>
          )}
        </div>
      </div>

      {/* Edit form (client component) */}
      <ActivityDetailEditor
        activityId={activityId}
        projectId={id}
        initialData={{
          name: activity.name,
          activityType: activity.activityType,
          status: activity.status,
          hypothesis: activity.hypothesis || "",
          methodology: activity.methodology || "",
          outcome: activity.outcome || "",
          technicalUncertainty: activity.technicalUncertainty || "",
          newKnowledgeSought: activity.newKnowledgeSought || "",
        }}
      />

      {/* Related Experiments */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Experiments ({activity.experiments.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Iteration</th>
                <th className="px-6 py-3 font-medium">Start</th>
                <th className="px-6 py-3 font-medium text-right">Resources</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activity.experiments.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No experiments yet.
                  </td>
                </tr>
              ) : (
                activity.experiments.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/rd/experiments/${exp.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {exp.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {exp.status}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      #{exp.iterationNumber}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {exp.startDate ? formatDate(exp.startDate) : "\u2014"}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-slate-600">
                      {exp.resources.length}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Entries */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Time Entries ({activity.timeEntries.length})
          </h2>
          <div className="text-sm text-slate-600">
            {totalHours.toFixed(1)}h total
            {totalTimeCost > 0 && <span className="ml-3">${fmt(totalTimeCost)}</span>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Person</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium text-right">Hours</th>
                <th className="px-6 py-3 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activity.timeEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No time entries yet.
                  </td>
                </tr>
              ) : (
                activity.timeEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-900">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {entry.user.name || entry.user.email}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {entry.description || "\u2014"}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-slate-900">
                      {entry.hours.toFixed(1)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-slate-600">
                      {entry.hourlyRate
                        ? `$${fmt(entry.hours * entry.hourlyRate)}`
                        : "\u2014"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Evidence ({activity.evidence.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th className="px-6 py-3 font-medium">File Name</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activity.evidence.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No evidence linked yet.
                  </td>
                </tr>
              ) : (
                activity.evidence.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">
                      {ev.fileName}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {ev.fileType}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {ev.description || "\u2014"}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {formatDate(ev.uploadedAt)}
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
