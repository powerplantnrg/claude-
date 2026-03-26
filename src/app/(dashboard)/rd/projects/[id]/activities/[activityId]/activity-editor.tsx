"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface ActivityData {
  name: string
  activityType: string
  status: string
  hypothesis: string
  methodology: string
  outcome: string
  technicalUncertainty: string
  newKnowledgeSought: string
}

export function ActivityDetailEditor({
  activityId,
  projectId,
  initialData,
}: {
  activityId: string
  projectId: string
  initialData: ActivityData
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState<ActivityData>(initialData)

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
      const res = await fetch(`/api/rd/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update activity")
      }

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
        className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
      >
        Edit Activity
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">
        Edit Activity
      </h3>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="NotStarted">Not Started</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
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
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Outcome
          </label>
          <textarea
            name="outcome"
            value={form.outcome}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Technical Uncertainty
          </label>
          <textarea
            name="technicalUncertainty"
            value={form.technicalUncertainty}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            New Knowledge Sought
          </label>
          <textarea
            name="newKnowledgeSought"
            value={form.newKnowledgeSought}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setForm(initialData)
              setOpen(false)
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
