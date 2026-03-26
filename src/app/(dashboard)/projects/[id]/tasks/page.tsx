"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface Task {
  id: string
  name: string
  description: string | null
  status: string
  estimatedHours: number | null
  budgetAmount: number | null
  startDate: string | null
  dueDate: string | null
  completedDate: string | null
  assignee: { id: string; name: string; email: string } | null
  totalHours: number
  totalCost: number
  timeEntryCount: number
}

const columns = [
  { key: "Todo", label: "To Do", color: "bg-slate-200" },
  { key: "InProgress", label: "In Progress", color: "bg-blue-200" },
  { key: "Review", label: "Review", color: "bg-purple-200" },
  { key: "Done", label: "Done", color: "bg-green-200" },
]

export default function TaskBoardPage() {
  const params = useParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"board" | "table">("board")
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskStatus, setNewTaskStatus] = useState("Todo")
  const [saving, setSaving] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}/tasks`)
      if (res.ok) {
        setTasks(await res.json())
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${params.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTaskName.trim(), status: newTaskStatus }),
      })
      if (res.ok) {
        setNewTaskName("")
        setShowNewTask(false)
        fetchTasks()
      }
    } catch (error) {
      console.error("Error creating task:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/projects/${params.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Are you sure you want to delete this task?")) return
    try {
      const res = await fetch(`/api/projects/${params.id}/tasks/${taskId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchTasks()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete task")
      }
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const fmtDate = (d: string | null) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Board</h1>
          <p className="mt-1 text-sm text-slate-500">
            {tasks.length} tasks | Drag and drop coming soon
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            <button
              onClick={() => setView("board")}
              className={`px-3 py-1.5 text-sm font-medium ${view === "board" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              Board
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 text-sm font-medium ${view === "table" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              Table
            </button>
          </div>
          <button
            onClick={() => setShowNewTask(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Add Task
          </button>
          <Link
            href={`/projects/${params.id}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Back
          </Link>
        </div>
      </div>

      {/* New Task Form */}
      {showNewTask && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form onSubmit={handleCreateTask} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Task Name</label>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter task name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={newTaskStatus}
                onChange={(e) => setNewTaskStatus(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {columns.map((col) => (
                  <option key={col.key} value={col.key}>{col.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setShowNewTask(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Board View */}
      {view === "board" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.key)
            return (
              <div key={col.key} className="rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${col.color}`} />
                    <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
                  </div>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-2 p-3 min-h-[200px]">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow transition-shadow"
                    >
                      <p className="text-sm font-medium text-slate-900">{task.name}</p>
                      {task.description && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {task.assignee && (
                            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5">
                              {task.assignee.name.split(" ")[0]}
                            </span>
                          )}
                          {task.estimatedHours && (
                            <span>{task.totalHours.toFixed(1)}/{task.estimatedHours}h</span>
                          )}
                          {task.dueDate && (
                            <span>{fmtDate(task.dueDate)}</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {col.key !== "Done" && (
                            <button
                              onClick={() => {
                                const idx = columns.findIndex((c) => c.key === col.key)
                                if (idx < columns.length - 1) {
                                  handleStatusChange(task.id, columns[idx + 1].key)
                                }
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              title="Move forward"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-8 text-xs text-slate-400">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {tasks.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No tasks yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Est. Hours</th>
                    <th className="px-4 py-3">Actual Hours</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">{task.name}</td>
                      <td className="px-4 py-3 text-slate-500">{task.assignee?.name || "-"}</td>
                      <td className="px-4 py-3">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                        >
                          {columns.map((col) => (
                            <option key={col.key} value={col.key}>{col.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{task.estimatedHours || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{task.totalHours.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-slate-700">${task.totalCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(task.dueDate)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
