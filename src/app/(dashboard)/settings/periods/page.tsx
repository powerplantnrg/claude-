"use client"

import { useState, useEffect, useCallback } from "react"
import { Lock, Unlock, Trash2, Plus, Calendar, AlertCircle, CheckCircle } from "lucide-react"

interface LockedPeriod {
  id: string
  periodStart: string
  periodEnd: string
  lockedAt: string
  reason: string
  status: "Locked" | "Unlocked"
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<LockedPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchPeriods = useCallback(async () => {
    try {
      const res = await fetch("/api/periods")
      if (!res.ok) throw new Error("Failed to fetch periods")
      const data = await res.json()
      setPeriods(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPeriods()
  }, [fetchPeriods])

  async function handleLockPeriod(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart, periodEnd, reason }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to lock period")
      }

      setSuccess("Period locked successfully")
      setShowForm(false)
      setPeriodStart("")
      setPeriodEnd("")
      setReason("")
      await fetchPeriods()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUnlock(id: string) {
    if (!confirm("Are you sure you want to unlock this period? This will allow modifications to transactions within this date range.")) {
      return
    }

    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/periods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Manual unlock from period management" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to unlock period")
      }

      setSuccess("Period unlocked successfully")
      await fetchPeriods()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this period lock record?")) {
      return
    }

    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/periods/${id}`, { method: "DELETE" })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete period")
      }

      setSuccess("Period record deleted")
      await fetchPeriods()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Calculate current FY
  const now = new Date()
  const fyEnd = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  const currentFY = `FY ${fyEnd - 1}/${fyEnd}`

  const lockedPeriods = periods.filter((p) => p.status === "Locked")
  const unlockedPeriods = periods.filter((p) => p.status === "Unlocked")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Period Locking</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lock accounting periods to prevent modifications to posted transactions
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Lock Period
        </button>
      </div>

      {/* Current FY Info */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-indigo-600" />
          <div>
            <p className="text-sm font-semibold text-indigo-900">
              Current Financial Year: {currentFY}
            </p>
            <p className="text-xs text-indigo-700">
              July 1, {fyEnd - 1} to June 30, {fyEnd}
            </p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Lock Period Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Lock New Period</h2>
          </div>
          <form onSubmit={handleLockPeriod} className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Period Start
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Period End
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Reason
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Month-end close for January 2025"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Lock className="h-4 w-4" />
                {submitting ? "Locking..." : "Lock Period"}
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

      {/* Locked Periods */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Locked Periods ({lockedPeriods.length})
          </h2>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500">Loading...</div>
        ) : lockedPeriods.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No periods are currently locked. Lock a period to prevent transaction modifications.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lockedPeriods.map((period) => (
              <div
                key={period.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                    <Lock className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {period.reason || "No reason provided"} &middot; Locked {formatDate(period.lockedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUnlock(period.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    Unlock
                  </button>
                  <button
                    onClick={() => handleDelete(period.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Previously Unlocked */}
      {unlockedPeriods.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Previously Unlocked ({unlockedPeriods.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {unlockedPeriods.map((period) => (
              <div
                key={period.id}
                className="flex items-center justify-between px-6 py-4 opacity-60"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <Unlock className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {period.reason || "No reason provided"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(period.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
