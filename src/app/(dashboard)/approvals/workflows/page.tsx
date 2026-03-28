import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const metadata = {
  title: "Approval Workflows",
}

export default async function ApprovalWorkflowsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const workflows = await prisma.approvalWorkflow.findMany({
    where: { organizationId: orgId },
    include: {
      steps: {
        include: { approver: { select: { id: true, name: true, email: true } } },
        orderBy: { stepOrder: "asc" },
      },
      _count: {
        select: { requests: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const fmt = (n: number | null) =>
    n != null
      ? n.toLocaleString("en-AU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "-"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approval Workflows</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure approval chains for different entity types and amounts
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/approvals"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Back to Approvals
          </Link>
          <Link
            href="/approvals/workflows/new"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Workflow
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Name
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Entity Type
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Amount Range
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Approvers
              </th>
              <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Auto-Approve Below
              </th>
              <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Requests
              </th>
              <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workflows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                  No approval workflows configured yet. Create your first workflow to get started.
                </td>
              </tr>
            )}
            {workflows.map((wf) => (
              <tr key={wf.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {wf.name}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                    {wf.entityType}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">
                  {wf.minAmount != null || wf.maxAmount != null ? (
                    <>
                      ${fmt(wf.minAmount)} &ndash; ${fmt(wf.maxAmount)}
                    </>
                  ) : (
                    <span className="text-slate-400">Any amount</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {wf.steps.map((step) => (
                      <div key={step.id} className="flex items-center gap-1.5">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                          {step.stepOrder}
                        </span>
                        <span className="text-xs text-slate-700">
                          {step.approver.name || step.approver.email}
                        </span>
                        <span className="text-xs text-slate-400">({step.role})</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-sm text-slate-700">
                  {wf.autoApproveBelow != null ? `$${fmt(wf.autoApproveBelow)}` : "-"}
                </td>
                <td className="px-6 py-4 text-center text-sm text-slate-700">
                  {wf._count.requests}
                </td>
                <td className="px-6 py-4 text-center">
                  {wf.active ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      Inactive
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
