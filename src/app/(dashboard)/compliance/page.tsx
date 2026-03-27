"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "@/lib/toast-store"

interface Deadline {
  id: string
  title: string
  description: string | null
  category: string
  dueDate: string
  frequency: string
  status: string
  completedAt: string | null
  reminderDays: number | null
  notes: string | null
}

const categoryColors: Record<string, string> = {
  BAS: "bg-blue-100 text-blue-700",
  PAYG: "bg-purple-100 text-purple-700",
  STP: "bg-indigo-100 text-indigo-700",
  "Tax Return": "bg-amber-100 text-amber-700",
  FBT: "bg-orange-100 text-orange-700",
  "R&D": "bg-green-100 text-green-700",
  Super: "bg-teal-100 text-teal-700",
  Other: "bg-gray-100 text-gray-700",
}

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Completed: "bg-green-100 text-green-700",
  Overdue: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-700",
}

const categories = ["BAS", "PAYG", "STP", "Tax Return", "FBT", "R&D", "Super", "Other"]

export default function CompliancePage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [grouped, setGrouped] = useState<Record<string, Deadline[]>>({})
  const [overdueCount, setOverdueCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState("")
  const [generating, setGenerating] = useState(false)

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: "",
    category: "BAS",
    dueDate: "",
    frequency: "One-off",
    description: "",
    reminderDays: "14",
  })
  const [saving, setSaving] = useState(false)

  const fetchDeadlines = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set("category", categoryFilter)
      const res = await fetch(`/api/compliance/deadlines?${params}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setDeadlines(data.deadlines)
      setGrouped(data.grouped)
      setOverdueCount(data.overdueCount)
    } catch {
      toast.error("Failed to load compliance deadlines")
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => {
    fetchDeadlines()
  }, [fetchDeadlines])

  async function handleGenerateFY() {
    setGenerating(true)
    try {
      const fyYear = new Date().getFullYear()
      const res = await fetch("/api/compliance/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateFY: true, fyYear }),
      })
      if (!res.ok) throw new Error("Failed to generate")
      const data = await res.json()
      toast.success(data.message)
      fetchDeadlines()
    } catch {
      toast.error("Failed to generate FY deadlines")
    } finally {
      setGenerating(false)
    }
  }

  async function handleMarkComplete(id: string) {
    try {
      const res = await fetch(`/api/compliance/deadlines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success("Deadline marked as complete")
      fetchDeadlines()
    } catch {
      toast.error("Failed to mark as complete")
    }
  }

  async function handleCreateDeadline(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/compliance/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          reminderDays: parseInt(form.reminderDays),
        }),
      })
      if (!res.ok) throw new Error("Failed to create")
      toast.success("Deadline created")
      setShowForm(false)
      setForm({ title: "", category: "BAS", dueDate: "", frequency: "One-off", description: "", reminderDays: "14" })
      fetchDeadlines()
    } catch {
      toast.error("Failed to create deadline")
    } finally {
      setSaving(false)
    }
  }

  const now = new Date()

  function isOverdue(d: Deadline) {
    return new Date(d.dueDate) < now && d.status !== "Completed" && d.status !== "Cancelled"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track regulatory deadlines and compliance obligations
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateFY}
            disabled={generating}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate FY Deadlines"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Deadline
          </button>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium text-red-800">
              {overdueCount} overdue deadline{overdueCount > 1 ? "s" : ""} require attention
            </p>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter("")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !categoryFilter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat === categoryFilter ? "" : cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === cat ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">New Compliance Deadline</h3>
          <form onSubmit={handleCreateDeadline} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Due Date *</label>
                <input
                  type="date"
                  required
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option>One-off</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Annual</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Deadline"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deadlines grouped by month */}
      {Object.keys(grouped).length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-slate-400">No compliance deadlines found. Generate FY deadlines to get started.</p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, items]) => {
            const [year, mon] = month.split("-")
            const monthName = new Date(parseInt(year), parseInt(mon) - 1).toLocaleString("en-AU", {
              month: "long",
              year: "numeric",
            })

            return (
              <div key={month}>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">{monthName}</h2>
                <div className="space-y-2">
                  {items.map((d: Deadline) => {
                    const overdue = isOverdue(d)
                    return (
                      <div
                        key={d.id}
                        className={`flex items-center justify-between rounded-lg border p-4 ${
                          overdue
                            ? "border-red-200 bg-red-50"
                            : d.status === "Completed"
                            ? "border-green-200 bg-green-50"
                            : "border-slate-200 bg-white"
                        } shadow-sm`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-slate-900">
                              {new Date(d.dueDate).getDate()}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(d.dueDate).toLocaleString("en-AU", { weekday: "short" })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{d.title}</p>
                            {d.description && (
                              <p className="text-xs text-slate-500">{d.description}</p>
                            )}
                            <div className="mt-1 flex gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  categoryColors[d.category] || categoryColors.Other
                                }`}
                              >
                                {d.category}
                              </span>
                              <span className="text-xs text-slate-400">{d.frequency}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              overdue
                                ? "bg-red-100 text-red-700"
                                : statusColors[d.status] || statusColors.Pending
                            }`}
                          >
                            {overdue ? "Overdue" : d.status}
                          </span>
                          {d.status !== "Completed" && d.status !== "Cancelled" && (
                            <button
                              onClick={() => handleMarkComplete(d.id)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
      )}
    </div>
  )
}
