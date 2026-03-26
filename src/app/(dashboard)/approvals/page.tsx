import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

const statusBadge: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
}

export const metadata = {
  title: "Approvals",
}

export default async function ApprovalsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id

  // Fetch all requests for this org
  const allRequests = await prisma.approvalRequest.findMany({
    where: { organizationId: orgId },
    include: {
      workflow: {
        include: {
          steps: {
            include: { approver: { select: { id: true, name: true } } },
            orderBy: { stepOrder: "asc" },
          },
        },
      },
      requestedBy: { select: { id: true, name: true, email: true } },
      actions: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { actionDate: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Awaiting my approval: pending requests where I'm the approver on the current step
  const awaitingMyApproval = allRequests.filter((req) => {
    if (req.status !== "Pending") return false
    const currentStepDef = req.workflow.steps.find(
      (s) => s.stepOrder === req.currentStep
    )
    return currentStepDef?.approverId === userId
  })

  // My requests: requests I submitted
  const myRequests = allRequests.filter((req) => req.requestedById === userId)

  // Summary stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pendingCount = allRequests.filter((r) => r.status === "Pending").length
  const approvedToday = allRequests.filter((r) => {
    if (r.status !== "Approved") return false
    const lastAction = r.actions[r.actions.length - 1]
    return lastAction && new Date(lastAction.actionDate) >= today
  }).length
  const rejectedToday = allRequests.filter((r) => {
    if (r.status !== "Rejected") return false
    const lastAction = r.actions[r.actions.length - 1]
    return lastAction && new Date(lastAction.actionDate) >= today
  }).length

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and manage approval requests
          </p>
        </div>
        <Link
          href="/approvals/workflows"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Manage Workflows
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pending</p>
          <p className="mt-1 text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Approved Today</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{approvedToday}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Rejected Today</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{rejectedToday}</p>
        </div>
      </div>

      {/* Awaiting My Approval */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Awaiting My Approval ({awaitingMyApproval.length})
        </h2>
        {awaitingMyApproval.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No requests awaiting your approval.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {awaitingMyApproval.map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                    {req.entityType}
                  </span>
                  <span className="text-xs text-slate-400">
                    Step {req.currentStep}/{req.totalSteps}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {req.workflow.name}
                </p>
                <p className="text-xs text-slate-500 mb-1">
                  Requested by: {req.requestedBy.name || req.requestedBy.email}
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  Entity ID: {req.entityId}
                </p>
                {req.notes && (
                  <p className="text-xs text-slate-500 mb-4 italic">
                    &ldquo;{req.notes}&rdquo;
                  </p>
                )}
                <div className="flex gap-2">
                  <form action={`/api/approvals/requests/${req.id}`} method="POST">
                    <Link
                      href={`/api/approvals/requests/${req.id}`}
                      className="inline-flex items-center rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                      onClick={(e) => {
                        e.preventDefault()
                      }}
                    >
                      Approve
                    </Link>
                  </form>
                  <Link
                    href={`/api/approvals/requests/${req.id}`}
                    className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                    onClick={(e) => {
                      e.preventDefault()
                    }}
                  >
                    Reject
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Requests */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          My Requests ({myRequests.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Workflow
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Entity Type
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Entity ID
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Progress
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Submitted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    You have not submitted any approval requests yet.
                  </td>
                </tr>
              )}
              {myRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {req.workflow.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {req.entityType}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">
                    {req.entityId}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-slate-600">
                    {req.currentStep}/{req.totalSteps}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        statusBadge[req.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-slate-500">
                    {new Date(req.createdAt).toLocaleDateString("en-AU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
