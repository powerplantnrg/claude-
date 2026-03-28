import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ComplianceChecklist } from "./compliance-checklist"

export default async function CompliancePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const projects = await prisma.rdProject.findMany({
    where: { organizationId: orgId },
    include: {
      complianceChecklist: {
        orderBy: [{ category: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const projectsData = projects.map((project) => {
    const total = project.complianceChecklist.length
    const completed = project.complianceChecklist.filter((c) => c.completed).length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    const byCategory = ["Documentation", "Financial", "Technical", "Registration"].map((cat) => ({
      category: cat,
      items: project.complianceChecklist.filter((c) => c.category === cat),
    }))

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      total,
      completed,
      percentage,
      byCategory,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Compliance Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track R&D compliance requirements across all projects
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Projects</p>
          <p className="mt-2 text-2xl font-bold text-indigo-700">{projectsData.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fully Compliant</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {projectsData.filter((p) => p.percentage === 100).length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Avg. Completion</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {projectsData.length > 0
              ? Math.round(projectsData.reduce((sum, p) => sum + p.percentage, 0) / projectsData.length)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Project Checklists */}
      {projectsData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No projects yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create R&D projects to start tracking compliance.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {projectsData.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Project Header */}
              <div className="border-b border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">{project.name}</h2>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        project.status === "Active"
                          ? "bg-emerald-50 text-emerald-700"
                          : project.status === "Completed"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    {project.completed}/{project.total} items
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Completion</span>
                    <span className="font-medium">{project.percentage}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        project.percentage === 100
                          ? "bg-emerald-500"
                          : project.percentage >= 50
                            ? "bg-indigo-500"
                            : "bg-amber-500"
                      }`}
                      style={{ width: `${project.percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Checklist Items by Category */}
              <ComplianceChecklist
                projectId={project.id}
                categories={JSON.parse(JSON.stringify(project.byCategory))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
