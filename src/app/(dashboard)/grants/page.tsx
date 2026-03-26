import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function GrantsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const grants = await prisma.grant.findMany({
    where: { organizationId: orgId },
    include: {
      milestones: { orderBy: { dueDate: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  })

  const statusColors: Record<string, string> = {
    Discovered: "bg-slate-100 text-slate-700",
    Researching: "bg-blue-100 text-blue-700",
    Applying: "bg-amber-100 text-amber-700",
    Submitted: "bg-indigo-100 text-indigo-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
    Active: "bg-emerald-100 text-emerald-700",
    Completed: "bg-slate-100 text-slate-600",
  }

  const totalGrantValue = grants
    .filter((g) => g.status === "Approved" || g.status === "Active")
    .reduce((sum, g) => sum + (g.amount || 0), 0)
  const activeGrants = grants.filter((g) => g.status === "Active" || g.status === "Approved").length
  const pendingGrants = grants.filter((g) =>
    ["Discovered", "Researching", "Applying", "Submitted"].includes(g.status)
  ).length
  const upcomingDeadlines = grants
    .filter((g) => g.applicationDeadline && new Date(g.applicationDeadline) > new Date())
    .sort((a, b) => new Date(a.applicationDeadline!).getTime() - new Date(b.applicationDeadline!).getTime())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Grant Tracking</h1>
          <p className="mt-1 text-sm text-slate-500">
            Discover, apply for, and manage R&D grants and incentives
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Grants</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{grants.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-600">Active / Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{activeGrants}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-600">In Pipeline</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{pendingGrants}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-indigo-600">Approved Value</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{formatCurrency(totalGrantValue)}</p>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-800">Upcoming Deadlines</h3>
          <div className="mt-2 space-y-1">
            {upcomingDeadlines.slice(0, 3).map((g) => (
              <div key={g.id} className="flex items-center justify-between">
                <Link href={`/grants/${g.id}`} className="text-sm text-amber-700 hover:text-amber-900 font-medium">
                  {g.name}
                </Link>
                <span className="text-sm text-amber-600">{formatDate(g.applicationDeadline!)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grants Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Grant Name</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3">Deadline</th>
                <th className="px-6 py-3">Milestones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2">No grants tracked yet</p>
                  </td>
                </tr>
              ) : (
                grants.map((grant) => {
                  const completedMilestones = grant.milestones.filter((m) => m.completed).length
                  return (
                    <tr key={grant.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Link href={`/grants/${grant.id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
                          {grant.name}
                        </Link>
                        {grant.description && (
                          <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{grant.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{grant.provider}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[grant.status] || "bg-slate-100 text-slate-700"}`}>
                          {grant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm tabular-nums text-slate-900">
                        {grant.amount ? formatCurrency(grant.amount) : "\u2014"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {grant.applicationDeadline ? formatDate(grant.applicationDeadline) : "\u2014"}
                      </td>
                      <td className="px-6 py-4">
                        {grant.milestones.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-slate-100">
                              <div
                                className="h-1.5 rounded-full bg-indigo-500"
                                style={{ width: `${(completedMilestones / grant.milestones.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500">
                              {completedMilestones}/{grant.milestones.length}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
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
