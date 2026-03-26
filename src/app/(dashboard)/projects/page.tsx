"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface ProjectSummary {
  id: string
  name: string
  code: string
  description: string | null
  status: string
  projectType: string
  billingMethod: string | null
  startDate: string | null
  endDate: string | null
  budgetAmount: number | null
  budgetHours: number | null
  estimatedRevenue: number | null
  hourlyRate: number | null
  isRdProject: boolean
  client: { id: string; name: string } | null
  manager: { id: string; name: string; email: string } | null
  taskCount: number
  completedTasks: number
  totalCost: number
  totalHours: number
  billableHours: number
  budgetUsedPercent: number
  hoursUsedPercent: number
  unbilledAmount: number
}

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  InProgress: "bg-blue-100 text-blue-700",
  Completed: "bg-slate-100 text-slate-700",
  OnHold: "bg-yellow-100 text-yellow-700",
  Cancelled: "bg-red-100 text-red-700",
  Draft: "bg-gray-100 text-gray-600",
}

const typeLabels: Record<string, string> = {
  FixedPrice: "Fixed Price",
  TimeAndMaterials: "Time & Materials",
  Internal: "Internal",
  RD: "R&D",
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      if (typeFilter) params.set("type", typeFilter)
      const res = await fetch(`/api/projects?${params.toString()}`)
      if (res.ok) {
        setProjects(await res.json())
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, typeFilter])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const activeProjects = projects.filter((p) => p.status === "Active" || p.status === "InProgress").length
  const totalBudget = projects.reduce((s, p) => s + (p.budgetAmount || 0), 0)
  const totalHours = projects.reduce((s, p) => s + p.totalHours, 0)
  const totalBillableHours = projects.reduce((s, p) => s + p.billableHours, 0)
  const utilizationRate = totalHours > 0 ? Math.round((totalBillableHours / totalHours) * 100) : 0
  const totalUnbilled = projects.reduce((s, p) => s + p.unbilledAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage project costing, time tracking, and profitability
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active Projects</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{activeProjects}</p>
          <p className="mt-1 text-xs text-slate-400">{projects.length} total</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Budget</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">${fmt(totalBudget)}</p>
          <p className="mt-1 text-xs text-slate-400">across all projects</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Utilization Rate</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{utilizationRate}%</p>
          <p className="mt-1 text-xs text-slate-400">
            {fmt(totalBillableHours)}h billable / {fmt(totalHours)}h total
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Unbilled WIP</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">${fmt(totalUnbilled)}</p>
          <p className="mt-1 text-xs text-slate-400">time + expenses</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="InProgress">In Progress</option>
          <option value="OnHold">On Hold</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Draft">Draft</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="FixedPrice">Fixed Price</option>
          <option value="TimeAndMaterials">Time & Materials</option>
          <option value="Internal">Internal</option>
          <option value="RD">R&D</option>
        </select>
      </div>

      {/* Projects Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            No projects found. Create your first project to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Budget</th>
                  <th className="px-4 py-3">Budget Used</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Hours Used</th>
                  <th className="px-4 py-3">Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${project.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                        {project.name}
                      </Link>
                      <div className="text-xs text-slate-400">{project.code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {project.client?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {typeLabels[project.projectType] || project.projectType}
                      {project.isRdProject && (
                        <span className="ml-1 inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                          R&D
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status] || "bg-gray-100 text-gray-600"}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {project.budgetAmount ? `$${fmt(project.budgetAmount)}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {project.budgetAmount ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-slate-200">
                            <div
                              className={`h-2 rounded-full ${
                                project.budgetUsedPercent > 90
                                  ? "bg-red-500"
                                  : project.budgetUsedPercent > 70
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(project.budgetUsedPercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{project.budgetUsedPercent}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {project.totalHours.toFixed(1)}h
                      {project.budgetHours && (
                        <span className="text-xs text-slate-400"> / {project.budgetHours}h</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {project.budgetHours ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-slate-200">
                            <div
                              className={`h-2 rounded-full ${
                                project.hoursUsedPercent > 90
                                  ? "bg-red-500"
                                  : project.hoursUsedPercent > 70
                                  ? "bg-yellow-500"
                                  : "bg-blue-500"
                              }`}
                              style={{ width: `${Math.min(project.hoursUsedPercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{project.hoursUsedPercent}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {project.completedTasks}/{project.taskCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
