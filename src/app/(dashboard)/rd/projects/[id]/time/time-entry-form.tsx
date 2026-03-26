"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Activity {
  id: string
  name: string
}

export function TimeEntryForm({ activities }: { activities: Activity[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    rdActivityId: activities[0]?.id || "",
    date: new Date().toISOString().split("T")[0],
    hours: "",
    description: "",
    hourlyRate: "",
  })

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/rd/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to log time")
      }

      setForm({
        rdActivityId: activities[0]?.id || "",
        date: new Date().toISOString().split("T")[0],
        hours: "",
        description: "",
        hourlyRate: "",
      })
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Add activities to the project before logging time.
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Log Time
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">
        Log Time Entry
      </h3>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Activity <span className="text-red-500">*</span>
            </label>
            <select
              name="rdActivityId"
              value={form.rdActivityId}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Hours <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="hours"
              value={form.hours}
              onChange={handleChange}
              required
              step="0.25"
              min="0.25"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="0.0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Hourly Rate
            </label>
            <input
              type="number"
              name="hourlyRate"
              value={form.hourlyRate}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="What did you work on?"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Log Time"}
          </button>
        </div>
      </form>
    </div>
  )
}
