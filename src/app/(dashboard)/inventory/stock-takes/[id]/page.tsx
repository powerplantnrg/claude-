"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface StockTakeItem {
  id: string
  inventoryItemId: string
  expectedQuantity: number
  countedQuantity: number
  variance: number
  varianceCost: number
  adjusted: boolean
  inventoryItem: {
    id: string
    name: string
    sku: string
    costPrice: number
    unitOfMeasure: string
  }
}

interface StockTake {
  id: string
  date: string
  status: string
  notes: string | null
  completedAt: string | null
  completedById: string | null
  items: StockTakeItem[]
}

const statusBadge: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  InProgress: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
}

export default function StockTakeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [stockTake, setStockTake] = useState<StockTake | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [counts, setCounts] = useState<Record<string, string>>({})

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  useEffect(() => {
    fetch(`/api/inventory/stock-takes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStockTake(null)
        } else {
          setStockTake(data)
          // Initialize counts from existing data
          const initial: Record<string, string> = {}
          for (const item of data.items) {
            initial[item.id] = String(item.countedQuantity)
          }
          setCounts(initial)
        }
      })
      .catch(() => setStockTake(null))
      .finally(() => setLoading(false))
  }, [id])

  const handleCountChange = (itemId: string, value: string) => {
    setCounts((prev) => ({ ...prev, [itemId]: value }))
  }

  const handleSaveCounts = async () => {
    if (!stockTake) return

    setSaving(true)
    try {
      const items = Object.entries(counts).map(([itemId, count]) => ({
        id: itemId,
        countedQuantity: count,
      }))

      const res = await fetch(`/api/inventory/stock-takes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })

      if (res.ok) {
        const data = await res.json()
        setStockTake(data)
        toast.success("Counts Saved", "Stock take counts have been updated.")
      } else {
        toast.error("Error", "Failed to save counts.")
      }
    } catch {
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (
      !confirm(
        "This will apply all variances as inventory adjustments. This cannot be undone. Continue?"
      )
    ) {
      return
    }

    setCompleting(true)
    try {
      // Save counts first
      const items = Object.entries(counts).map(([itemId, count]) => ({
        id: itemId,
        countedQuantity: count,
      }))

      await fetch(`/api/inventory/stock-takes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })

      // Then complete
      const res = await fetch(`/api/inventory/stock-takes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      })

      if (res.ok) {
        const data = await res.json()
        setStockTake(data)
        toast.success("Stock Take Completed", "All variances have been applied as adjustments.")
      } else {
        const data = await res.json()
        toast.error("Error", data.error || "Failed to complete stock take.")
      }
    } catch {
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setCompleting(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this stock take?")) return

    try {
      const res = await fetch(`/api/inventory/stock-takes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })

      if (res.ok) {
        toast.success("Cancelled", "Stock take has been cancelled.")
        router.push("/inventory/stock-takes")
      } else {
        toast.error("Error", "Failed to cancel stock take.")
      }
    } catch {
      toast.error("Error", "An unexpected error occurred.")
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Loading stock take...
      </div>
    )
  }

  if (!stockTake) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Stock take not found.
        </div>
        <Link href="/inventory/stock-takes" className="text-sm text-blue-600 hover:text-blue-800">
          Back to Stock Takes
        </Link>
      </div>
    )
  }

  const isEditable = stockTake.status === "Draft" || stockTake.status === "InProgress"

  const totalVariance = stockTake.items.reduce(
    (sum, item) => {
      const counted = parseInt(counts[item.id] || "0")
      return sum + (counted - item.expectedQuantity)
    },
    0
  )

  const totalVarianceCost = stockTake.items.reduce(
    (sum, item) => {
      const counted = parseInt(counts[item.id] || "0")
      const variance = counted - item.expectedQuantity
      return sum + variance * (item.inventoryItem?.costPrice || 0)
    },
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Stock Take</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                statusBadge[stockTake.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {stockTake.status === "InProgress" ? "In Progress" : stockTake.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(stockTake.date).toLocaleDateString("en-AU")} &middot;{" "}
            {stockTake.items.length} items
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isEditable && (
            <>
              <button
                onClick={handleCancel}
                className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 transition-colors"
              >
                Cancel Stock Take
              </button>
              <button
                onClick={handleSaveCounts}
                disabled={saving}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save Counts"}
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {completing ? "Completing..." : "Complete Stock Take"}
              </button>
            </>
          )}
          <Link
            href="/inventory/stock-takes"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Items to Count
          </dt>
          <dd className="mt-2 text-2xl font-bold text-slate-900">
            {stockTake.items.length}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Variance (Units)
          </dt>
          <dd className={`mt-2 text-2xl font-bold ${totalVariance === 0 ? "text-green-600" : "text-red-600"}`}>
            {totalVariance >= 0 ? `+${totalVariance}` : totalVariance}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Variance Cost
          </dt>
          <dd className={`mt-2 text-2xl font-bold ${totalVarianceCost >= 0 ? "text-green-600" : "text-red-600"}`}>
            {totalVarianceCost >= 0 ? "" : "-"}${fmt(Math.abs(totalVarianceCost))}
          </dd>
        </div>
      </div>

      {/* Notes */}
      {stockTake.notes && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">{stockTake.notes}</p>
        </div>
      )}

      {/* Items Grid */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  SKU
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Item Name
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Expected
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Counted
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Variance
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Variance Cost
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockTake.items.map((item) => {
                const counted = parseInt(counts[item.id] || "0")
                const variance = counted - item.expectedQuantity
                const varianceCost = variance * (item.inventoryItem?.costPrice || 0)

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {item.inventoryItem?.sku}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <Link
                        href={`/inventory/${item.inventoryItemId}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {item.inventoryItem?.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      {item.expectedQuantity}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      {isEditable ? (
                        <input
                          type="number"
                          min="0"
                          value={counts[item.id] || "0"}
                          onChange={(e) => handleCountChange(item.id, e.target.value)}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="font-medium text-slate-900">{item.countedQuantity}</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-medium ${
                      variance === 0
                        ? "text-slate-600"
                        : variance > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {variance >= 0 ? `+${variance}` : variance}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-medium ${
                      varianceCost === 0
                        ? "text-slate-600"
                        : varianceCost > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {varianceCost >= 0 ? "" : "-"}${fmt(Math.abs(varianceCost))}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.adjusted ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Adjusted
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
