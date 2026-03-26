"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Activity } from "lucide-react"

type AuditLogEntry = {
  id: string
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  details: string | null
  organizationId: string
  timestamp: string
  user: { id: string; name: string | null; email: string } | null
}

type AuditLogResponse = {
  data: AuditLogEntry[]
  total: number
  page: number
  pages: number
}

function getActionIcon(action: string) {
  switch (action.toUpperCase()) {
    case "CREATE":
      return <Plus className="h-3.5 w-3.5 text-emerald-600" />
    case "UPDATE":
      return <Pencil className="h-3.5 w-3.5 text-blue-600" />
    case "DELETE":
      return <Trash2 className="h-3.5 w-3.5 text-rose-600" />
    default:
      return <Activity className="h-3.5 w-3.5 text-slate-500" />
  }
}

function getActionIconBg(action: string) {
  switch (action.toUpperCase()) {
    case "CREATE":
      return "bg-emerald-50 dark:bg-emerald-900/30"
    case "UPDATE":
      return "bg-blue-50 dark:bg-blue-900/30"
    case "DELETE":
      return "bg-rose-50 dark:bg-rose-900/30"
    default:
      return "bg-slate-100 dark:bg-slate-700"
  }
}

function relativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return "just now"
  if (diffMin === 1) return "1 minute ago"
  if (diffMin < 60) return `${diffMin} minutes ago`
  if (diffHr === 1) return "1 hour ago"
  if (diffHr < 24) return `${diffHr} hours ago`
  if (diffDay === 1) return "1 day ago"
  return `${diffDay} days ago`
}

function formatEntityType(entityType: string): string {
  // Convert "JournalEntry" -> "journal entry"
  return entityType.replace(/([A-Z])/g, " $1").trim().toLowerCase()
}

export function RecentActivity() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/audit-log?limit=10")
      if (!res.ok) throw new Error("Failed to fetch")
      const data: AuditLogResponse = await res.json()
      setEntries(data.data)
      setError(null)
    } catch {
      setError("Unable to load recent activity")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
    const interval = setInterval(fetchEntries, 60000)
    return () => clearInterval(interval)
  }, [fetchEntries])

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Recent Activity
        </h2>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-slate-400">{error}</p>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
            No recent activity
          </p>
        ) : (
          <div className="space-y-1">
            {entries.map((entry, idx) => (
              <div key={entry.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5">
                {/* Timeline line and icon */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${getActionIconBg(
                      entry.action
                    )}`}
                  >
                    {getActionIcon(entry.action)}
                  </div>
                  {idx < entries.length - 1 && (
                    <div className="mt-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium">
                      {entry.user?.name || entry.user?.email || "System"}
                    </span>{" "}
                    <span className="text-slate-500 dark:text-slate-400">
                      {entry.action.toLowerCase()}d
                    </span>{" "}
                    <span>{formatEntityType(entry.entityType)}</span>
                    {entry.details && (
                      <span className="text-slate-500 dark:text-slate-400">
                        {" "}
                        &mdash; {entry.details}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    {relativeTime(entry.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
