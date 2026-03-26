"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function ActivityForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    activityType: "Core",
    hypothesis: "",
    methodology: "",
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
      const res = await fetch("/api/rd/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rdProjectId: projectId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create activity")
      }

      setForm({ name: "", activityType: "Core", hypothesis: "", methodology: "" })
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Add Activity
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">
        Add New Activity
      </h3>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Activity Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g., Neural network architecture optimization"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              name="activityType"
              value={form.activityType}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Core">Core R&D</option>
              <option value="Supporting">Supporting</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Hypothesis
          </label>
          <textarea
            name="hypothesis"
            value={form.hypothesis}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="What hypothesis does this activity test?"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Methodology
          </label>
          <textarea
            name="methodology"
            value={form.methodology}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Describe the systematic approach..."
          />
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
            {submitting ? "Adding..." : "Add Activity"}
          </button>
        </div>
      </form>
    </div>
  )
}
