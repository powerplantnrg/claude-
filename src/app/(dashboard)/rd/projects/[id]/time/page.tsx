import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { TimeEntryForm } from "./time-entry-form"

export default async function TimeTrackingPage({
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

  const timeEntries = await prisma.rdTimeEntry.findMany({
    where: {
      rdActivity: { rdProjectId: id },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      rdActivity: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  })

  const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0)
  const totalCost = timeEntries.reduce(
    (sum, e) => sum + e.hours * (e.hourlyRate || 0),
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
        <span className="text-slate-700">Time Tracking</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Time Tracking</h1>
          <p className="text-sm text-slate-500">
            Log and track R&D time for {project.name}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Total Hours</p>
          <p className="text-3xl font-bold text-slate-900">
            {totalHours.toFixed(1)}
          </p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
          <p className="text-sm font-medium text-indigo-600">Total Cost</p>
          <p className="text-3xl font-bold text-indigo-700">
            {formatCurrency(totalCost)}
          </p>
        </div>
      </div>

      {/* Log Time Form */}
      <TimeEntryForm activities={project.activities} />

      {/* Time Entries Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Time Entries ({timeEntries.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-left text-sm text-slate-500">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Activity</th>
                <th className="px-6 py-3 font-medium text-right">Hours</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium text-right">
                  Hourly Rate
                </th>
                <th className="px-6 py-3 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timeEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No time entries yet. Use the form above to log time.
                  </td>
                </tr>
              ) : (
                timeEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-700">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700">
                      {entry.user.name || entry.user.email}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">
                      {entry.rdActivity.name}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                      {entry.hours.toFixed(1)}
                    </td>
                    <td className="max-w-xs truncate px-6 py-3 text-sm text-slate-500">
                      {entry.description || "\u2014"}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-slate-600">
                      {entry.hourlyRate
                        ? formatCurrency(entry.hourlyRate)
                        : "\u2014"}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                      {entry.hourlyRate
                        ? formatCurrency(entry.hours * entry.hourlyRate)
                        : "\u2014"}
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
