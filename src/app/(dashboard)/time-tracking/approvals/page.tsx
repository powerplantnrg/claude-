"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface TimeEntry {
  id: string
  date: string
  hours: number
  description: string | null
  billable: boolean
  amount: number | null
  approvalStatus: string
  project: { id: string; name: string; code: string }
  task: { id: string; name: string } | null
  user: { id: string; name: string; email: string }
}

interface GroupedByUser {
  user: { id: string; name: string; email: string }
  entries: TimeEntry[]
  totalHours: number
  totalAmount: number
}

export default function TimeApprovalsPage() {
  const [pendingEntries, setPendingEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  const fetchPending = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/time-entries?approvalStatus=Pending")
      if (res.ok) {
        setPendingEntries(await res.json())
      }
    } catch (error) {
      console.error("Error fetching pending entries:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  async function handleApproval(entryId: string, action: "Approved" | "Rejected") {
    setProcessing((prev) => new Set(prev).add(entryId))
    try {
      const res = await fetch(`/api/time-entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: action }),
      })
      if (res.ok) {
        setPendingEntries((prev) => prev.filter((e) => e.id !== entryId))
      }
    } catch (error) {
      console.error("Error updating entry:", error)
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(entryId)
        return next
      })
    }
  }

  async function handleBulkApproval(userEntries: TimeEntry[], action: "Approved" | "Rejected") {
    const ids = userEntries.map((e) => e.id)
    setProcessing((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/time-entries/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approvalStatus: action }),
          })
        )
      )
      setPendingEntries((prev) => prev.filter((e) => !ids.includes(e.id)))
    } catch (error) {
      console.error("Error bulk updating entries:", error)
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })

  // Group by user
  const grouped: GroupedByUser[] = []
  const userMap: Record<string, GroupedByUser> = {}
  for (const entry of pendingEntries) {
    if (!userMap[entry.user.id]) {
      userMap[entry.user.id] = {
        user: entry.user,
        entries: [],
        totalHours: 0,
        totalAmount: 0,
      }
      grouped.push(userMap[entry.user.id])
    }
    userMap[entry.user.id].entries.push(entry)
    userMap[entry.user.id].totalHours += entry.hours
    userMap[entry.user.id].totalAmount += entry.amount || 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Time Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and approve pending time entries
          </p>
        </div>
        <Link
          href="/time-tracking"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to Time Tracking
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pending Entries</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{pendingEntries.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Hours</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {pendingEntries.reduce((s, e) => s + e.hours, 0).toFixed(1)}h
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Amount</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            ${fmt(pendingEntries.reduce((s, e) => s + (e.amount || 0), 0))}
          </p>
        </div>
      </div>

      {/* Grouped by User */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-500 shadow-sm">
          No pending time entries to approve.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.user.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* User Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50 rounded-t-xl">
                <div>
                  <p className="font-medium text-slate-900">{group.user.name}</p>
                  <p className="text-xs text-slate-500">
                    {group.entries.length} entries | {group.totalHours.toFixed(1)}h | ${fmt(group.totalAmount)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkApproval(group.entries, "Approved")}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    Approve All
                  </button>
                  <button
                    onClick={() => handleBulkApproval(group.entries, "Rejected")}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    Reject All
                  </button>
                </div>
              </div>

              {/* Entries */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase text-slate-400">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Project</th>
                      <th className="px-4 py-2">Task</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2">Hours</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Billable</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {group.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700">{fmtDate(entry.date)}</td>
                        <td className="px-4 py-2">
                          <Link
                            href={`/projects/${entry.project.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {entry.project.code}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-slate-500">{entry.task?.name || "-"}</td>
                        <td className="px-4 py-2 text-slate-500 max-w-xs truncate">
                          {entry.description || "-"}
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-700">
                          {entry.hours.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-slate-700">${fmt(entry.amount || 0)}</td>
                        <td className="px-4 py-2">
                          {entry.billable ? (
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApproval(entry.id, "Approved")}
                              disabled={processing.has(entry.id)}
                              className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproval(entry.id, "Rejected")}
                              disabled={processing.has(entry.id)}
                              className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
