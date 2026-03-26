"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

interface Project {
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
  notes: string | null
  client: { id: string; name: string; email?: string } | null
  manager: { id: string; name: string; email: string } | null
  tasks: Task[]
  timeEntries: TimeEntryItem[]
  expenses: ExpenseItem[]
  milestones: MilestoneItem[]
  profitability: {
    totalCost: number
    totalTimeCost: number
    totalExpenseCost: number
    revenue: number
    profit: number
    margin: number
    unbilledAmount: number
  }
  timeSummary: {
    totalHours: number
    billableHours: number
    nonBillableHours: number
    budgetHours: number | null
    hoursUsedPercent: number
  }
  budgetSummary: {
    budgetAmount: number | null
    totalCost: number
    budgetUsedPercent: number
    remaining: number | null
  }
}

interface Task {
  id: string
  name: string
  description: string | null
  status: string
  estimatedHours: number | null
  assignee: { id: string; name: string } | null
  dueDate: string | null
  completedDate: string | null
}

interface TimeEntryItem {
  id: string
  date: string
  hours: number
  description: string | null
  billable: boolean
  billed: boolean
  amount: number | null
  approvalStatus: string
  user: { id: string; name: string }
  task: { id: string; name: string } | null
}

interface ExpenseItem {
  id: string
  description: string
  amount: number
  date: string
  category: string
  billable: boolean
  billed: boolean
  approvalStatus: string
}

interface MilestoneItem {
  id: string
  name: string
  description: string | null
  amount: number | null
  dueDate: string | null
  status: string
}

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  InProgress: "bg-blue-100 text-blue-700",
  Completed: "bg-slate-100 text-slate-700",
  OnHold: "bg-yellow-100 text-yellow-700",
  Cancelled: "bg-red-100 text-red-700",
  Draft: "bg-gray-100 text-gray-600",
}

const milestoneStatusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Invoiced: "bg-blue-100 text-blue-700",
  Paid: "bg-green-100 text-green-700",
}

const typeLabels: Record<string, string> = {
  FixedPrice: "Fixed Price",
  TimeAndMaterials: "Time & Materials",
  Internal: "Internal",
  RD: "R&D",
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "time" | "expenses" | "milestones">("overview")

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`)
      if (res.ok) {
        setProject(await res.json())
      } else if (res.status === 404) {
        router.push("/projects")
      }
    } catch (error) {
      console.error("Error fetching project:", error)
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const fmtDate = (d: string | null) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="py-20 text-center text-slate-500">Project not found</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status] || "bg-gray-100 text-gray-600"}`}>
              {project.status}
            </span>
            {project.isRdProject && (
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                R&D
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {project.code} | {typeLabels[project.projectType] || project.projectType}
            {project.client && ` | ${project.client.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${project.id}/tasks`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Task Board
          </Link>
          <Link
            href="/projects"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Budget</p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {project.budgetSummary.budgetAmount ? `$${fmt(project.budgetSummary.budgetAmount)}` : "No Budget"}
          </p>
          {project.budgetSummary.budgetAmount && (
            <>
              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div
                  className={`h-2 rounded-full ${
                    project.budgetSummary.budgetUsedPercent > 90 ? "bg-red-500" : project.budgetSummary.budgetUsedPercent > 70 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(project.budgetSummary.budgetUsedPercent, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                ${fmt(project.budgetSummary.totalCost)} spent ({project.budgetSummary.budgetUsedPercent}%)
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Hours</p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {project.timeSummary.totalHours.toFixed(1)}h
            {project.timeSummary.budgetHours && (
              <span className="text-sm font-normal text-slate-400"> / {project.timeSummary.budgetHours}h</span>
            )}
          </p>
          {project.timeSummary.budgetHours && (
            <>
              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div
                  className={`h-2 rounded-full ${
                    project.timeSummary.hoursUsedPercent > 90 ? "bg-red-500" : project.timeSummary.hoursUsedPercent > 70 ? "bg-yellow-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(project.timeSummary.hoursUsedPercent, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {project.timeSummary.billableHours.toFixed(1)}h billable | {project.timeSummary.nonBillableHours.toFixed(1)}h non-billable
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Profitability</p>
          <p className={`mt-2 text-xl font-bold ${project.profitability.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${fmt(project.profitability.profit)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {project.profitability.margin}% margin | Revenue: ${fmt(project.profitability.revenue)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Unbilled WIP</p>
          <p className="mt-2 text-xl font-bold text-amber-600">
            ${fmt(project.profitability.unbilledAmount)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Tasks: {project.tasks.filter((t) => t.status === "Done").length}/{project.tasks.length} complete
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {(["overview", "time", "expenses", "milestones"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "overview" ? "Overview" : tab === "time" ? "Time Entries" : tab === "expenses" ? "Expenses" : "Milestones"}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Project Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Project Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Manager</p>
                <p className="mt-1 text-sm text-slate-700">{project.manager?.name || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Start Date</p>
                <p className="mt-1 text-sm text-slate-700">{fmtDate(project.startDate)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">End Date</p>
                <p className="mt-1 text-sm text-slate-700">{fmtDate(project.endDate)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Billing Method</p>
                <p className="mt-1 text-sm text-slate-700">{project.billingMethod || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Hourly Rate</p>
                <p className="mt-1 text-sm text-slate-700">
                  {project.hourlyRate ? `$${fmt(project.hourlyRate)}` : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Est. Revenue</p>
                <p className="mt-1 text-sm text-slate-700">
                  {project.estimatedRevenue ? `$${fmt(project.estimatedRevenue)}` : "-"}
                </p>
              </div>
            </div>
            {project.description && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase text-slate-400">Description</p>
                <p className="mt-1 text-sm text-slate-700">{project.description}</p>
              </div>
            )}
            {project.notes && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase text-slate-400">Notes</p>
                <p className="mt-1 text-sm text-slate-700">{project.notes}</p>
              </div>
            )}
          </div>

          {/* Tasks Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Tasks</h3>
              <Link
                href={`/projects/${project.id}/tasks`}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View Board
              </Link>
            </div>
            {project.tasks.length === 0 ? (
              <p className="text-sm text-slate-500">No tasks yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-400">
                      <th className="pb-2 pr-4">Task</th>
                      <th className="pb-2 pr-4">Assignee</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Est. Hours</th>
                      <th className="pb-2">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.tasks.slice(0, 10).map((task) => (
                      <tr key={task.id}>
                        <td className="py-2 pr-4 font-medium text-slate-700">{task.name}</td>
                        <td className="py-2 pr-4 text-slate-500">{task.assignee?.name || "-"}</td>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            task.status === "Done" ? "bg-green-100 text-green-700" :
                            task.status === "InProgress" ? "bg-blue-100 text-blue-700" :
                            task.status === "Review" ? "bg-purple-100 text-purple-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-slate-500">{task.estimatedHours || "-"}</td>
                        <td className="py-2 text-slate-500">{fmtDate(task.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Profitability Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Profitability Summary</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Time Costs</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">${fmt(project.profitability.totalTimeCost)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Expense Costs</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">${fmt(project.profitability.totalExpenseCost)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Total Cost</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">${fmt(project.profitability.totalCost)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Revenue</p>
                <p className="mt-1 text-lg font-semibold text-green-600">${fmt(project.profitability.revenue)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "time" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {project.timeEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No time entries recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Billable</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.timeEntries.map((te) => (
                    <tr key={te.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{fmtDate(te.date)}</td>
                      <td className="px-4 py-3 text-slate-700">{te.user.name}</td>
                      <td className="px-4 py-3 text-slate-500">{te.task?.name || "-"}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{te.description || "-"}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{te.hours.toFixed(1)}</td>
                      <td className="px-4 py-3 text-slate-700">${fmt(te.amount || 0)}</td>
                      <td className="px-4 py-3">
                        {te.billable ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          te.approvalStatus === "Approved" ? "bg-green-100 text-green-700" :
                          te.approvalStatus === "Rejected" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {te.approvalStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {project.expenses.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No expenses recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Billable</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{fmtDate(exp.date)}</td>
                      <td className="px-4 py-3 text-slate-700">{exp.description}</td>
                      <td className="px-4 py-3 text-slate-500">{exp.category}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">${fmt(exp.amount)}</td>
                      <td className="px-4 py-3">
                        {exp.billable ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          exp.approvalStatus === "Approved" ? "bg-green-100 text-green-700" :
                          exp.approvalStatus === "Rejected" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {exp.approvalStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "milestones" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {project.milestones.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No milestones defined.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {project.milestones.map((ms) => (
                <div key={ms.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-slate-900">{ms.name}</p>
                    {ms.description && (
                      <p className="mt-0.5 text-sm text-slate-500">{ms.description}</p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400">Due: {fmtDate(ms.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {ms.amount && (
                      <p className="text-lg font-semibold text-slate-900">${fmt(ms.amount)}</p>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      milestoneStatusColors[ms.status] || "bg-gray-100 text-gray-600"
                    }`}>
                      {ms.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
