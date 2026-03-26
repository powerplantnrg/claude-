"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface Account {
  id: string
  code: string
  name: string
  type: string
}

interface RdProject {
  id: string
  name: string
  status: string
}

interface RdActivity {
  id: string
  name: string
  rdProjectId: string
  activityType: string
}

interface JournalLineItem {
  accountId: string
  description: string
  debit: number
  credit: number
  rdProjectId: string
  rdActivityId: string
}

const emptyLine: JournalLineItem = {
  accountId: "",
  description: "",
  debit: 0,
  credit: 0,
  rdProjectId: "",
  rdActivityId: "",
}

function generateRef(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `JE-${y}${m}${d}-${rand}`
}

export default function NewJournalEntryPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<RdProject[]>([])
  const [activities, setActivities] = useState<RdActivity[]>([])
  const [activitiesByProject, setActivitiesByProject] = useState<Record<string, RdActivity[]>>({})

  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [reference, setReference] = useState(generateRef)
  const [narration, setNarration] = useState("")
  const [lines, setLines] = useState<JournalLineItem[]>([{ ...emptyLine }, { ...emptyLine }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAccounts(data)
      })
    fetch("/api/rd/projects?status=Active")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data)
      })
  }, [])

  // Fetch activities when a project is selected on any line
  const fetchActivities = useCallback(
    async (projectId: string) => {
      if (activitiesByProject[projectId]) return
      try {
        const res = await fetch(`/api/rd/activities?projectId=${projectId}`)
        const data = await res.json()
        if (Array.isArray(data)) {
          setActivitiesByProject((prev) => ({ ...prev, [projectId]: data }))
          setActivities((prev) => {
            const existing = new Set(prev.map((a) => a.id))
            const newOnes = data.filter((a: RdActivity) => !existing.has(a.id))
            return [...prev, ...newOnes]
          })
        }
      } catch {
        // silently ignore
      }
    },
    [activitiesByProject]
  )

  const updateLine = useCallback(
    (index: number, field: keyof JournalLineItem, value: string | number) => {
      setLines((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }

        // Clear activity if project changes
        if (field === "rdProjectId") {
          updated[index].rdActivityId = ""
          if (value) {
            fetchActivities(value as string)
          }
        }

        return updated
      })
    },
    [fetchActivities]
  )

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }])

  const removeLine = (index: number) => {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const totalDebits = lines.reduce((sum, l) => sum + (l.debit || 0), 0)
  const totalCredits = lines.reduce((sum, l) => sum + (l.credit || 0), 0)
  const difference = Math.abs(totalDebits - totalCredits)
  const isBalanced = difference < 0.005

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const handleSubmit = async (status: "Draft" | "Posted") => {
    setError("")
    const errors: Record<string, string> = {}

    if (!date) {
      errors.date = "Date is required."
    }
    if (!narration.trim()) {
      errors.narration = "Narration/description is required."
    }
    if (lines.some((l) => !l.accountId)) {
      errors.lines = "Each line must have an account selected."
    }
    if (lines.some((l) => l.debit === 0 && l.credit === 0)) {
      errors.amounts = "Each line must have either a debit or credit amount."
    }
    if (lines.some((l) => l.debit > 0 && l.credit > 0)) {
      errors.dualEntry = "A line cannot have both a debit and credit amount."
    }
    if (status === "Posted" && !isBalanced) {
      errors.balance = "Total debits must equal total credits before posting."
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
      const payload = {
        date,
        reference,
        narration,
        status,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          description: l.description || undefined,
          debit: l.debit || 0,
          credit: l.credit || 0,
          rdProjectId: l.rdProjectId || undefined,
          rdActivityId: l.rdActivityId || undefined,
        })),
      }

      const res = await fetch("/api/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        const errMsg = data.error || "Failed to create journal entry."
        setError(errMsg)
        toast.error("Failed to Create Journal Entry", errMsg)
        return
      }

      toast.success("Journal Entry Created", status === "Posted" ? "Journal entry has been posted." : "Journal entry saved as draft.")
      router.push("/journal-entries")
    } catch {
      setError("An unexpected error occurred.")
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  const getActivitiesForProject = (projectId: string): RdActivity[] => {
    return activitiesByProject[projectId] || []
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Journal Entry</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a manual journal entry
          </p>
        </div>
        <Link
          href="/journal-entries"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header Fields */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.date; return n }) }}
              className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${fieldErrors.date ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"}`}
            />
            {fieldErrors.date && <p className="mt-1 text-xs text-red-600">{fieldErrors.date}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-400">Auto-generated, editable</p>
          </div>
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Narration / Description
            </label>
            <textarea
              value={narration}
              onChange={(e) => { setNarration(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.narration; return n }) }}
              rows={2}
              className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${fieldErrors.narration ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"}`}
              placeholder="Describe the purpose of this journal entry..."
            />
            {fieldErrors.narration && <p className="mt-1 text-xs text-red-600">{fieldErrors.narration}</p>}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-48">
                  Account
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Description
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">
                  Debit
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">
                  Credit
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-40">
                  R&D Project
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-40">
                  R&D Activity
                </th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">
                    <select
                      value={line.accountId}
                      onChange={(e) => updateLine(i, "accountId", e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select account...</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(i, "description", e.target.value)}
                      placeholder="Line description"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        updateLine(i, "debit", val)
                        if (val > 0) updateLine(i, "credit", 0)
                      }}
                      placeholder="0.00"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-right text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        updateLine(i, "credit", val)
                        if (val > 0) updateLine(i, "debit", 0)
                      }}
                      placeholder="0.00"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-right text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={line.rdProjectId}
                      onChange={(e) => updateLine(i, "rdProjectId", e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={line.rdActivityId}
                      onChange={(e) => updateLine(i, "rdActivityId", e.target.value)}
                      disabled={!line.rdProjectId}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">None</option>
                      {getActivitiesForProject(line.rdProjectId).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      disabled={lines.length <= 2}
                      className="rounded p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Remove line"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-6 py-3">
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Line
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="ml-auto max-w-sm space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Total Debits</span>
            <span className="font-mono font-medium text-slate-900">${fmt(totalDebits)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Total Credits</span>
            <span className="font-mono font-medium text-slate-900">${fmt(totalCredits)}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
            <span className="font-semibold text-slate-900">Difference</span>
            <span
              className={`font-mono font-bold ${
                isBalanced ? "text-emerald-600" : "text-red-600"
              }`}
            >
              ${fmt(difference)}
              {isBalanced && (
                <span className="ml-2 text-xs font-normal text-emerald-500">Balanced</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link
          href="/journal-entries"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => handleSubmit("Draft")}
          disabled={submitting}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Saving..." : "Save as Draft"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("Posted")}
          disabled={submitting || !isBalanced}
          className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={!isBalanced ? "Debits must equal credits to post" : ""}
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  )
}
