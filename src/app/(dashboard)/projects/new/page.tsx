"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Contact {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

interface RdProject {
  id: string
  name: string
}

export default function NewProjectPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [rdProjects, setRdProjects] = useState<RdProject[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [clientId, setClientId] = useState("")
  const [projectType, setProjectType] = useState("TimeAndMaterials")
  const [billingMethod, setBillingMethod] = useState("")
  const [status, setStatus] = useState("Active")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [budgetAmount, setBudgetAmount] = useState("")
  const [budgetHours, setBudgetHours] = useState("")
  const [estimatedRevenue, setEstimatedRevenue] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")
  const [managerId, setManagerId] = useState("")
  const [isRdProject, setIsRdProject] = useState(false)
  const [rdProjectId, setRdProjectId] = useState("")
  const [notes, setNotes] = useState("")

  const loadData = useCallback(async () => {
    try {
      const [contactsRes, usersRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/users"),
      ])
      if (contactsRes.ok) setContacts(await contactsRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())

      // Try loading R&D projects
      try {
        const rdRes = await fetch("/api/rd/projects")
        if (rdRes.ok) {
          const rdData = await rdRes.json()
          setRdProjects(Array.isArray(rdData) ? rdData : rdData.projects || [])
        }
      } catch {
        // R&D projects may not exist yet
      }
    } catch (error) {
      console.error("Error loading form data:", error)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Project name is required")
      return
    }

    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          clientId: clientId || null,
          projectType,
          billingMethod: billingMethod || null,
          status,
          startDate: startDate || null,
          endDate: endDate || null,
          budgetAmount: budgetAmount || null,
          budgetHours: budgetHours || null,
          estimatedRevenue: estimatedRevenue || null,
          hourlyRate: hourlyRate || null,
          managerId: managerId || null,
          isRdProject,
          rdProjectId: rdProjectId || null,
          notes: notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create project")
        return
      }

      const project = await res.json()
      router.push(`/projects/${project.id}`)
    } catch {
      setError("Failed to create project")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Project</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a new project for job costing and time tracking
          </p>
        </div>
        <Link
          href="/projects"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Project Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter project name"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Project description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">No Client</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Manager</label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select Manager</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="InProgress">In Progress</option>
                <option value="OnHold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Type & Billing */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Type & Billing</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Type</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="TimeAndMaterials">Time & Materials</option>
                <option value="FixedPrice">Fixed Price</option>
                <option value="Internal">Internal</option>
                <option value="RD">R&D</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Billing Method</label>
              <select
                value={billingMethod}
                onChange={(e) => setBillingMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select Method</option>
                <option value="Hourly">Hourly</option>
                <option value="Fixed">Fixed Fee</option>
                <option value="Milestone">Milestone</option>
                <option value="Monthly">Monthly Retainer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Budget & Schedule */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Budget & Schedule</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget Hours</label>
              <input
                type="number"
                step="0.5"
                value={budgetHours}
                onChange={(e) => setBudgetHours(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Revenue ($)</label>
              <input
                type="number"
                step="0.01"
                value={estimatedRevenue}
                onChange={(e) => setEstimatedRevenue(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* R&D Linking */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">R&D Linking</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isRdProject}
                onChange={(e) => setIsRdProject(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">This is an R&D project eligible for tax incentives</span>
            </label>
            {isRdProject && rdProjects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Link to R&D Project
                </label>
                <select
                  value={rdProjectId}
                  onChange={(e) => setRdProjectId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select R&D Project</option>
                  {rdProjects.map((rp) => (
                    <option key={rp.id} value={rp.id}>{rp.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Additional notes..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/projects"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  )
}
