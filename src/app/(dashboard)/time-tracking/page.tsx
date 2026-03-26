"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface TimeEntry {
  id: string
  date: string
  hours: number
  description: string | null
  billable: boolean
  billed: boolean
  amount: number | null
  hourlyRate: number | null
  approvalStatus: string
  project: { id: string; name: string; code: string }
  task: { id: string; name: string } | null
  user: { id: string; name: string; email: string }
}

interface Project {
  id: string
  name: string
  code: string
}

interface Task {
  id: string
  name: string
}

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Filters
  const [filterProject, setFilterProject] = useState("")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterBillable, setFilterBillable] = useState("")

  // Form state
  const [formProjectId, setFormProjectId] = useState("")
  const [formTaskId, setFormTaskId] = useState("")
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0])
  const [formHours, setFormHours] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formBillable, setFormBillable] = useState(true)

  // Timer
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStart, setTimerStart] = useState<number | null>(null)
  const [timerElapsed, setTimerElapsed] = useState(0)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterProject) params.set("projectId", filterProject)
      if (filterStartDate) params.set("startDate", filterStartDate)
      if (filterEndDate) params.set("endDate", filterEndDate)
      if (filterBillable) params.set("billable", filterBillable)

      const res = await fetch(`/api/time-entries?${params.toString()}`)
      if (res.ok) {
        setEntries(await res.json())
      }
    } catch (error) {
      console.error("Error fetching time entries:", error)
    } finally {
      setLoading(false)
    }
  }, [filterProject, filterStartDate, filterEndDate, filterBillable])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects")
      if (res.ok) setProjects(await res.json())
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }, [])

  const fetchTasks = useCallback(async (projectId: string) => {
    if (!projectId) {
      setTasks([])
      return
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`)
      if (res.ok) setTasks(await res.json())
    } catch (error) {
      console.error("Error fetching tasks:", error)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
    fetchProjects()
  }, [fetchEntries, fetchProjects])

  useEffect(() => {
    fetchTasks(formProjectId)
  }, [formProjectId, fetchTasks])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (timerRunning && timerStart) {
      interval = setInterval(() => {
        setTimerElapsed(Date.now() - timerStart)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerRunning, timerStart])

  function toggleTimer() {
    if (timerRunning) {
      setTimerRunning(false)
      const hours = timerElapsed / 3600000
      setFormHours(Math.round(hours * 4) / 4 + "") // Round to nearest 0.25
    } else {
      setTimerStart(Date.now())
      setTimerElapsed(0)
      setTimerRunning(true)
    }
  }

  function formatTimer(ms: number) {
    const totalSeconds = Math.floor(ms / 1000)
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formProjectId || !formDate || !formHours) return
    setSaving(true)
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: formProjectId,
          taskId: formTaskId || null,
          date: formDate,
          hours: formHours,
          description: formDescription || null,
          billable: formBillable,
        }),
      })
      if (res.ok) {
        setFormProjectId("")
        setFormTaskId("")
        setFormHours("")
        setFormDescription("")
        setFormBillable(true)
        setShowForm(false)
        fetchEntries()
      }
    } catch (error) {
      console.error("Error creating time entry:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this time entry?")) return
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" })
      if (res.ok) fetchEntries()
    } catch (error) {
      console.error("Error deleting entry:", error)
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })

  const totalHours = entries.reduce((s, e) => s + e.hours, 0)
  const totalBillableHours = entries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0)
  const totalAmount = entries.reduce((s, e) => s + (e.amount || 0), 0)

  // Group entries by week for weekly grid
  const weeklyData: Record<string, TimeEntry[]> = {}
  entries.forEach((entry) => {
    const date = new Date(entry.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const key = weekStart.toISOString().split("T")[0]
    if (!weeklyData[key]) weeklyData[key] = []
    weeklyData[key].push(entry)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Time Tracking</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track time against projects and tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/time-tracking/approvals"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Approvals
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Log Time
          </button>
        </div>
      </div>

      {/* Timer */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-3xl font-mono font-bold text-slate-900">
              {formatTimer(timerElapsed)}
            </p>
            <button
              onClick={toggleTimer}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                timerRunning
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {timerRunning ? "Stop" : "Start Timer"}
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>Total: <strong className="text-slate-900">{totalHours.toFixed(1)}h</strong></span>
            <span>Billable: <strong className="text-green-600">{totalBillableHours.toFixed(1)}h</strong></span>
            <span>Amount: <strong className="text-slate-900">${fmt(totalAmount)}</strong></span>
          </div>
        </div>
      </div>

      {/* Quick Entry Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Quick Entry</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Task</label>
              <select
                value={formTaskId}
                onChange={(e) => setFormTaskId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">No Task</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Hours <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                value={formHours}
                onChange={(e) => setFormHours(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0.0"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="What did you work on?"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formBillable}
                  onChange={(e) => setFormBillable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Billable</span>
              </label>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Save Entry"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Start Date"
        />
        <input
          type="date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="End Date"
        />
        <select
          value={filterBillable}
          onChange={(e) => setFilterBillable(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="true">Billable</option>
          <option value="false">Non-Billable</option>
        </select>
      </div>

      {/* Time Entries Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            No time entries found. Start tracking your time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Billable</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{fmtDate(entry.date)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/projects/${entry.project.id}`} className="text-blue-600 hover:text-blue-800">
                        {entry.project.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{entry.task?.name || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{entry.description || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{entry.hours.toFixed(1)}</td>
                    <td className="px-4 py-3 text-slate-700">${fmt(entry.amount || 0)}</td>
                    <td className="px-4 py-3">
                      {entry.billable ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.approvalStatus === "Approved" ? "bg-green-100 text-green-700" :
                        entry.approvalStatus === "Rejected" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {entry.approvalStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!entry.billed && (
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
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
