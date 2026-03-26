"use client"

import { useState, useMemo } from "react"

type ExperimentRow = {
  id: string
  name: string
  projectId: string
  projectName: string
  activityName: string
  status: string
  iterationNumber: number
  startDate: string | null
  totalCost: number
  outcome: string | null
}

type Project = {
  id: string
  name: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const STATUS_COLORS: Record<string, string> = {
  Planned: "bg-slate-100 text-slate-700",
  Running: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
  Designing: "bg-amber-100 text-amber-700",
  Analysing: "bg-violet-100 text-violet-700",
}

export function ExperimentFilters({
  experiments,
  projects,
}: {
  experiments: ExperimentRow[]
  projects: Project[]
}) {
  const [projectFilter, setProjectFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const statuses = useMemo(() => {
    const set = new Set(experiments.map((e) => e.status))
    return Array.from(set).sort()
  }, [experiments])

  const filtered = useMemo(() => {
    return experiments.filter((exp) => {
      if (projectFilter && exp.projectId !== projectFilter) return false
      if (statusFilter && exp.status !== statusFilter) return false
      return true
    })
  }, [experiments, projectFilter, statusFilter])

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Project
          </label>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {(projectFilter || statusFilter) && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setProjectFilter("")
                setStatusFilter("")
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        )}
        <div className="flex items-end ml-auto">
          <span className="text-sm text-slate-500">
            {filtered.length} experiment{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No experiments found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-sm text-slate-500">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Project</th>
                  <th className="px-6 py-3 font-medium">Activity</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-center">Iter#</th>
                  <th className="px-6 py-3 font-medium">Start Date</th>
                  <th className="px-6 py-3 font-medium text-right">
                    Resources
                  </th>
                  <th className="px-6 py-3 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {exp.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {exp.projectName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {exp.activityName}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[exp.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600">
                      {exp.iterationNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {exp.startDate ? formatDate(exp.startDate) : "-"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {exp.totalCost > 0
                        ? formatCurrency(exp.totalCost)
                        : "-"}
                    </td>
                    <td className="max-w-[200px] truncate px-6 py-4 text-sm text-slate-500">
                      {exp.outcome || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
