import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { ActivityForm } from "./activity-form"

export default async function ActivitiesPage({
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
  })
  if (!project) notFound()

  const activities = await prisma.rdActivity.findMany({
    where: { rdProjectId: id },
    include: {
      _count: {
        select: { experiments: true, evidence: true, timeEntries: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const activityTypeColor: Record<string, string> = {
    Core: "bg-indigo-100 text-indigo-700",
    Supporting: "bg-sky-100 text-sky-700",
  }

  const statusColor: Record<string, string> = {
    InProgress: "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    NotStarted: "bg-slate-100 text-slate-700",
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
        <span className="text-slate-700">Activities</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activities</h1>
          <p className="text-sm text-slate-500">
            R&D activities for {project.name}
          </p>
        </div>
      </div>

      {/* Add Activity Form (client component) */}
      <ActivityForm projectId={id} />

      {/* Activities List */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th className="px-6 py-3 font-medium">Activity</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Hypothesis</th>
                <th className="px-6 py-3 font-medium text-right">
                  Experiments
                </th>
                <th className="px-6 py-3 font-medium text-right">
                  Evidence
                </th>
                <th className="px-6 py-3 font-medium text-right">
                  Time Entries
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No activities yet. Use the form above to add one.
                  </td>
                </tr>
              ) : (
                activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/rd/projects/${id}/activities/${activity.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {activity.name}
                      </Link>
                      {activity.methodology && (
                        <p className="mt-0.5 truncate text-xs text-slate-400 max-w-xs">
                          {activity.methodology}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          activityTypeColor[activity.activityType] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {activity.activityType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusColor[activity.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {activity.status}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-600">
                      {activity.hypothesis || "\u2014"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      {activity._count.experiments}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      {activity._count.evidence}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      {activity._count.timeEntries}
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
