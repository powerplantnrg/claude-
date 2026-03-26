"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

export default function NewRdProjectPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    budget: "",
    coreActivityDescription: "",
    hypothesisSummary: "",
    technicalUncertainty: "",
    newKnowledgeSought: "",
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[e.target.name]
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const errors: Record<string, string> = {}

    if (!form.name.trim()) {
      errors.name = "Project name is required."
    }
    if (!form.startDate) {
      errors.startDate = "Start date is required."
    }
    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      errors.endDate = "End date must be after start date."
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const msg = Object.values(errors)[0]
      setError(msg)
      toast.error("Validation Error", msg)
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/rd/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create project")
      }

      const project = await res.json()
      toast.success("R&D Project Created", `${form.name} has been created successfully.`)
      router.push(`/rd/projects/${project.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(message)
      toast.error("Failed to Create Project", message)
      setSubmitting(false)
    }
  }

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
      fieldErrors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-red-500"
        : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
    }`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/rd" className="hover:text-indigo-600">
            R&D Intelligence
          </Link>
          <span>/</span>
          <Link href="/rd/projects" className="hover:text-indigo-600">
            Projects
          </Link>
          <span>/</span>
          <span className="text-slate-700">New Project</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          New R&D Project
        </h1>
        <p className="text-sm text-slate-500">
          Define your R&D project details and compliance documentation
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Project Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={inputClass("name")}
                placeholder="e.g., AI-Powered Document Analysis Engine"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Brief overview of the R&D project"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  className={inputClass("startDate")}
                />
                {fieldErrors.startDate && <p className="mt-1 text-xs text-red-600">{fieldErrors.startDate}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                  className={inputClass("endDate")}
                />
                {fieldErrors.endDate && <p className="mt-1 text-xs text-red-600">{fieldErrors.endDate}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Budget (AUD)
                </label>
                <input
                  type="number"
                  name="budget"
                  value={form.budget}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* R&D Compliance Fields */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            R&D Tax Incentive Documentation
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            These fields support your R&D Tax Incentive claim under the
            Australian program
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Core Activity Description
              </label>
              <textarea
                name="coreActivityDescription"
                value={form.coreActivityDescription}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Describe the core R&D activities that involve systematic experimentation..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Hypothesis Summary
              </label>
              <textarea
                name="hypothesisSummary"
                value={form.hypothesisSummary}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="What hypothesis are you testing through this R&D project?"
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
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="What technical uncertainties exist that cannot be resolved by existing knowledge?"
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
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="What new knowledge do you aim to generate through this project?"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/rd/projects"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting && <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
            {submitting ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  )
}
