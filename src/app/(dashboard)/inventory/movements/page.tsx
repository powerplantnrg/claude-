"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface InventoryItem {
  id: string
  name: string
  sku: string
}

interface Movement {
  id: string
  type: string
  quantity: number
  unitCost: number
  totalCost: number
  reference: string | null
  date: string
  notes: string | null
  inventoryItem: { id: string; name: string; sku: string }
}

const movementTypes = ["Purchase", "Sale", "Adjustment", "Transfer", "WriteOff", "Return"]

const typeBadge: Record<string, string> = {
  Purchase: "bg-green-100 text-green-700",
  Sale: "bg-blue-100 text-blue-700",
  Adjustment: "bg-yellow-100 text-yellow-700",
  Transfer: "bg-purple-100 text-purple-700",
  WriteOff: "bg-red-100 text-red-700",
  Return: "bg-indigo-100 text-indigo-700",
}

export default function InventoryMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("")
  const [itemFilter, setItemFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    inventoryItemId: "",
    type: "Adjustment",
    quantity: "",
    unitCost: "",
    reference: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const fetchMovements = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (typeFilter) params.set("type", typeFilter)
      if (itemFilter) params.set("itemId", itemFilter)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)

      const res = await fetch(`/api/inventory/movements?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setMovements(data)
      }
    } catch {
      toast.error("Error", "Failed to load movements")
    } finally {
      setLoading(false)
    }
  }, [typeFilter, itemFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  useEffect(() => {
    fetch("/api/inventory?active=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.items) {
          setItems(data.items.map((i: any) => ({ id: i.id, name: i.name, sku: i.sku })))
        }
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.inventoryItemId || !form.quantity) {
      toast.error("Validation Error", "Item and quantity are required.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: parseInt(form.quantity),
          unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined,
        }),
      })

      if (res.ok) {
        toast.success("Movement Created", "Inventory adjustment has been recorded.")
        setShowForm(false)
        setForm({
          inventoryItemId: "",
          type: "Adjustment",
          quantity: "",
          unitCost: "",
          reference: "",
          date: new Date().toISOString().split("T")[0],
          notes: "",
        })
        fetchMovements()
      } else {
        const data = await res.json()
        toast.error("Error", data.error || "Failed to create movement.")
      }
    } catch {
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Movements</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track all stock movements, adjustments, and transfers
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
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Adjustment
          </button>
        </div>
      </div>

      {/* Adjustment Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Create Stock Adjustment</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Item *
                </label>
                <select
                  value={form.inventoryItemId}
                  onChange={(e) => setForm((prev) => ({ ...prev, inventoryItemId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">Select item...</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.sku} - {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Type *
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {movementTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  placeholder="e.g., 10 or -5"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Unit Cost ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) => setForm((prev) => ({ ...prev, unitCost: e.target.value }))}
                  placeholder="Leave blank for item cost"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Reference
                </label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
                  placeholder="e.g., PO-001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Optional notes..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Creating..." : "Create Movement"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {movementTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={itemFilter}
          onChange={(e) => setItemFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Items</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.sku} - {i.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From date"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To date"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Movements Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Item
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Quantity
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Unit Cost
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Cost
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reference
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">
                    Loading movements...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">
                    No movements found.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(m.date).toLocaleDateString("en-AU")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/inventory/${m.inventoryItem.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {m.inventoryItem.sku}
                      </Link>
                      <span className="ml-2 text-slate-600">{m.inventoryItem.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          typeBadge[m.type] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      ${fmt(m.unitCost)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      ${fmt(m.totalCost)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {m.reference || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                      {m.notes || "-"}
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
