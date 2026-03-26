"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

type UserOption = {
  id: string
  name: string | null
  email: string
}

const ACTION_TYPES = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "VIEW", "EXPORT"]
const ENTITY_TYPES = [
  "User",
  "Organization",
  "Account",
  "JournalEntry",
  "Invoice",
  "Bill",
  "Contact",
  "RdProject",
  "RdActivity",
  "Experiment",
  "Grant",
  "BankTransaction",
]

export function AuditLogTable({ users }: { users: UserOption[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const currentPage = parseInt(searchParams.get("page") ?? "1", 10)
  const [filterUserId, setFilterUserId] = useState(searchParams.get("userId") ?? "")
  const [filterAction, setFilterAction] = useState(searchParams.get("action") ?? "")
  const [filterEntityType, setFilterEntityType] = useState(searchParams.get("entityType") ?? "")
  const [filterEntityId, setFilterEntityId] = useState(searchParams.get("entityId") ?? "")
  const [filterDateFrom, setFilterDateFrom] = useState(searchParams.get("dateFrom") ?? "")
  const [filterDateTo, setFilterDateTo] = useState(searchParams.get("dateTo") ?? "")

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", currentPage.toString())
    params.set("limit", "25")
    if (filterUserId) params.set("userId", filterUserId)
    if (filterAction) params.set("action", filterAction)
    if (filterEntityType) params.set("entityType", filterEntityType)
    if (filterEntityId) params.set("entityId", filterEntityId)
    if (filterDateFrom) params.set("dateFrom", filterDateFrom)
    if (filterDateTo) params.set("dateTo", filterDateTo)

    try {
      const res = await fetch(`/api/audit-log?${params.toString()}`)
      if (res.ok) {
        const data: AuditLogResponse = await res.json()
        setLogs(data.data)
        setTotal(data.total)
        setPages(data.pages)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [currentPage, filterUserId, filterAction, filterEntityType, filterEntityId, filterDateFrom, filterDateTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function navigateToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/settings/audit-log?${params.toString()}`)
  }

  function applyFilters() {
    const params = new URLSearchParams()
    params.set("page", "1")
    if (filterUserId) params.set("userId", filterUserId)
    if (filterAction) params.set("action", filterAction)
    if (filterEntityType) params.set("entityType", filterEntityType)
    if (filterEntityId) params.set("entityId", filterEntityId)
    if (filterDateFrom) params.set("dateFrom", filterDateFrom)
    if (filterDateTo) params.set("dateTo", filterDateTo)
    router.push(`/settings/audit-log?${params.toString()}`)
  }

  function clearFilters() {
    setFilterUserId("")
    setFilterAction("")
    setFilterEntityType("")
    setFilterEntityId("")
    setFilterDateFrom("")
    setFilterDateTo("")
    router.push("/settings/audit-log")
  }

  function formatTimestamp(ts: string) {
    return new Date(ts).toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  function truncateDetails(details: string | null, maxLen = 80) {
    if (!details) return "-"
    if (details.length <= maxLen) return details
    return details.slice(0, maxLen) + "..."
  }

  function renderDetails(details: string | null) {
    if (!details) return <span className="text-slate-400">No details</span>
    try {
      const parsed = JSON.parse(details)
      return (
        <pre className="whitespace-pre-wrap text-xs text-slate-700 bg-slate-50 rounded-lg p-4 max-h-96 overflow-auto">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )
    } catch {
      return <p className="text-sm text-slate-700 whitespace-pre-wrap">{details}</p>
    }
  }

  const hasFilters = filterUserId || filterAction || filterEntityType || filterEntityId || filterDateFrom || filterDateTo

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              showFilters || hasFilters
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="ml-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-xs text-white">
                !
              </span>
            )}
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500">
          {total} {total === 1 ? "entry" : "entries"} found
        </p>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">User</label>
              <select
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">All users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">All actions</option>
                {ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Entity Type</label>
              <select
                value={filterEntityType}
                onChange={(e) => setFilterEntityType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">All types</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Entity ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={filterEntityId}
                  onChange={(e) => setFilterEntityId(e.target.value)}
                  placeholder="Search by entity ID..."
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={applyFilters}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3 font-medium text-slate-600">Timestamp</th>
                <th className="px-4 py-3 font-medium text-slate-600">User</th>
                <th className="px-4 py-3 font-medium text-slate-600">Action</th>
                <th className="px-4 py-3 font-medium text-slate-600">Entity Type</th>
                <th className="px-4 py-3 font-medium text-slate-600">Entity ID</th>
                <th className="px-4 py-3 font-medium text-slate-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No audit log entries found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {expandedRow === log.id ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {log.user?.name || log.user?.email || "System"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            log.action === "CREATE" && "bg-green-50 text-green-700",
                            log.action === "UPDATE" && "bg-blue-50 text-blue-700",
                            log.action === "DELETE" && "bg-red-50 text-red-700",
                            log.action === "LOGIN" && "bg-amber-50 text-amber-700",
                            log.action === "LOGOUT" && "bg-slate-100 text-slate-700",
                            !["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"].includes(log.action) &&
                              "bg-slate-100 text-slate-600"
                          )}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{log.entityType}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {log.entityId ? log.entityId.slice(0, 12) + "..." : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                        {truncateDetails(log.details)}
                      </td>
                    </tr>
                    {expandedRow === log.id && (
                      <tr key={`${log.id}-details`}>
                        <td colSpan={7} className="bg-slate-50 px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex gap-6 text-xs text-slate-500">
                              <span>
                                <strong className="text-slate-700">Full Entity ID:</strong>{" "}
                                {log.entityId || "N/A"}
                              </span>
                              <span>
                                <strong className="text-slate-700">Log ID:</strong> {log.id}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-600 mb-1">Details:</p>
                              {renderDetails(log.details)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
            <p className="text-sm text-slate-600">
              Page {currentPage} of {pages} ({total} total)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateToPage(1)}
                disabled={currentPage <= 1}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigateToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigateToPage(currentPage + 1)}
                disabled={currentPage >= pages}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigateToPage(pages)}
                disabled={currentPage >= pages}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
