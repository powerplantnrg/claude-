import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function GrantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const grant = await prisma.grant.findFirst({
    where: { id, organizationId: orgId },
    include: {
      milestones: { orderBy: { dueDate: "asc" } },
    },
  })

  if (!grant) notFound()

  const completedMilestones = grant.milestones.filter((m) => m.completed).length
  const totalMilestoneSpend = grant.milestones.reduce(
    (sum, m) => sum + (m.spendToDate || 0),
    0
  )

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

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href="/grants"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Grants
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{grant.name}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[grant.status] || "bg-slate-100 text-slate-700"}`}>
              {grant.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Provider: <span className="font-medium text-slate-700">{grant.provider}</span>
          </p>
          {grant.description && (
            <p className="mt-2 text-sm text-slate-600">{grant.description}</p>
          )}
        </div>
      </div>

      {/* Key Details */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Grant Amount</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {grant.amount ? formatCurrency(grant.amount) : "TBD"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Deadline</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {grant.applicationDeadline ? formatDate(grant.applicationDeadline) : "N/A"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Spend to Date</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(totalMilestoneSpend)}
          </p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-sm font-medium text-indigo-600">Milestones</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">
            {completedMilestones} / {grant.milestones.length}
          </p>
        </div>
      </div>

      {/* Milestone Progress */}
      {grant.milestones.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Milestone Progress</h3>
            <span className="text-sm text-slate-500">
              {grant.milestones.length > 0
                ? ((completedMilestones / grant.milestones.length) * 100).toFixed(0)
                : 0}% complete
            </span>
          </div>
          <div className="mb-6 h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-indigo-600 transition-all"
              style={{
                width: `${grant.milestones.length > 0 ? (completedMilestones / grant.milestones.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Milestones Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Milestones</h2>
        </div>
        {grant.milestones.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            No milestones defined for this grant
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {grant.milestones.map((milestone) => (
              <div key={milestone.id} className="flex items-center gap-4 px-6 py-4">
                {milestone.completed ? (
                  <svg className="h-5 w-5 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 flex-shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${milestone.completed ? "text-slate-400 line-through" : "text-slate-900"}`}>
                    {milestone.title}
                  </p>
                  {milestone.evidence && (
                    <p className="mt-0.5 text-xs text-slate-400">{milestone.evidence}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  {milestone.dueDate && (
                    <span className="text-xs">{formatDate(milestone.dueDate)}</span>
                  )}
                  {milestone.spendToDate !== null && milestone.spendToDate !== undefined && (
                    <span className="font-mono text-xs tabular-nums">{formatCurrency(milestone.spendToDate)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
