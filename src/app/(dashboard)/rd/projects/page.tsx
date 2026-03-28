import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function RdProjectsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const projects = await prisma.rdProject.findMany({
    where: { organizationId: orgId },
    include: {
      _count: {
        select: { activities: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const eligibilityColor: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700",
    Eligible: "bg-green-100 text-green-700",
    Ineligible: "bg-red-100 text-red-700",
    PartiallyEligible: "bg-blue-100 text-blue-700",
  }

  const statusColor: Record<string, string> = {
    Active: "bg-indigo-100 text-indigo-700",
    Completed: "bg-green-100 text-green-700",
    OnHold: "bg-amber-100 text-amber-700",
    Cancelled: "bg-red-100 text-red-700",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">R&D Projects</h1>
          <p className="text-sm text-slate-500">
            Manage your research and development projects
          </p>
        </div>
        <Link
          href="/rd/projects/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New Project
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Start Date</th>
                <th className="px-6 py-3 font-medium text-right">Budget</th>
                <th className="px-6 py-3 font-medium">Eligibility</th>
                <th className="px-6 py-3 font-medium text-right">
                  Activities
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No projects yet.{" "}
                    <Link
                      href="/rd/projects/new"
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      Create your first R&D project
                    </Link>
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/rd/projects/${project.id}`}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {project.name}
                      </Link>
                      {project.description && (
                        <p className="mt-0.5 truncate text-sm text-slate-400 max-w-xs">
                          {project.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusColor[project.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(project.startDate)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">
                      {project.budget
                        ? formatCurrency(project.budget)
                        : "\u2014"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          eligibilityColor[project.eligibilityStatus] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {project.eligibilityStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      {project._count.activities}
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
