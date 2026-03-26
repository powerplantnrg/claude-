"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface StockTake {
  id: string
  date: string
  status: string
  notes: string | null
  completedAt: string | null
  itemCount: number
}

const statusBadge: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  InProgress: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
}

export default function StockTakesPage() {
  const [stockTakes, setStockTakes] = useState<StockTake[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState("")

  const fetchStockTakes = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/inventory/stock-takes?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setStockTakes(data)
      }
    } catch {
      toast.error("Error", "Failed to load stock takes")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchStockTakes()
  }, [fetchStockTakes])

  const handleCreateStockTake = async () => {
    if (!confirm("This will create a new stock take with all tracked inventory items. Continue?")) {
      return
    }

    setCreating(true)
    try {
      const res = await fetch("/api/inventory/stock-takes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          notes: "",
        }),
      })

      if (res.ok) {
        toast.success("Stock Take Created", "A new stock take has been created with all tracked items.")
        fetchStockTakes()
      } else {
        const data = await res.json()
        toast.error("Error", data.error || "Failed to create stock take.")
      }
    } catch {
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Takes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Perform physical inventory counts and reconcile stock levels
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Back to Inventory
          </Link>
          <button
            onClick={handleCreateStockTake}
            disabled={creating}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating && (
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            New Stock Take
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="InProgress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Stock Takes Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Items
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Notes
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Completed At
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    Loading stock takes...
                  </td>
                </tr>
              ) : stockTakes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    No stock takes found. Create one to start counting inventory.
                  </td>
                </tr>
              ) : (
                stockTakes.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                      {new Date(st.date).toLocaleDateString("en-AU")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusBadge[st.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {st.status === "InProgress" ? "In Progress" : st.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      {st.itemCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                      {st.notes || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {st.completedAt
                        ? new Date(st.completedAt).toLocaleDateString("en-AU")
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/inventory/stock-takes/${st.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {st.status === "Completed" || st.status === "Cancelled"
                          ? "View"
                          : "Continue"}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
