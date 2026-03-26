"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  unitOfMeasure: string
  costPrice: number
  sellingPrice: number
  quantityOnHand: number
  reorderLevel: number | null
  isTracked: boolean
  isActive: boolean
  location: string | null
}

interface Summary {
  totalItems: number
  totalStockValue: number
  reorderAlerts: number
  lowStock: number
}

const categories = [
  "General",
  "Raw Materials",
  "Finished Goods",
  "Components",
  "Consumables",
  "Packaging",
  "Lab Supplies",
  "Electronics",
  "Chemicals",
  "Other",
]

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [activeFilter, setActiveFilter] = useState("true")
  const [trackedFilter, setTrackedFilter] = useState("")

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (categoryFilter) params.set("category", categoryFilter)
      if (activeFilter) params.set("active", activeFilter)
      if (trackedFilter) params.set("tracked", trackedFilter)

      const res = await fetch(`/api/inventory?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items)
        setSummary(data.summary)
      }
    } catch {
      toast.error("Error", "Failed to load inventory")
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, activeFilter, trackedFilter])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const isLowStock = (item: InventoryItem) =>
    item.isTracked &&
    item.reorderLevel !== null &&
    item.quantityOnHand <= item.reorderLevel

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your inventory items, stock levels, and movements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/movements"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Movements
          </Link>
          <Link
            href="/inventory/new"
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
            Add Item
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Items
            </dt>
            <dd className="mt-2 text-2xl font-bold text-slate-900">
              {summary.totalItems}
            </dd>
            <p className="mt-1 text-xs text-slate-500">Active inventory items</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Stock Value
            </dt>
            <dd className="mt-2 text-2xl font-bold text-green-600">
              ${fmt(summary.totalStockValue)}
            </dd>
            <p className="mt-1 text-xs text-slate-500">Total at cost price</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Reorder Alerts
            </dt>
            <dd className="mt-2 text-2xl font-bold text-red-600">
              {summary.reorderAlerts}
            </dd>
            <p className="mt-1 text-xs text-slate-500">Below reorder level</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Low Stock
            </dt>
            <dd className="mt-2 text-2xl font-bold text-orange-600">
              {summary.lowStock}
            </dd>
            <p className="mt-1 text-xs text-slate-500">Approaching reorder level</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
          <option value="">All</option>
        </select>
        <select
          value={trackedFilter}
          onChange={(e) => setTrackedFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Tracking</option>
          <option value="true">Tracked</option>
          <option value="false">Untracked</option>
        </select>
        <Link
          href="/inventory/reports"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
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
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Reports
        </Link>
      </div>

      {/* Items Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  SKU
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Category
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Quantity
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cost Price
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Value
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    Loading inventory...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    No inventory items found. Add your first item to get started.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {item.sku}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      <span className={isLowStock(item) ? "text-red-600" : ""}>
                        {item.quantityOnHand}
                      </span>
                      {isLowStock(item) && (
                        <span className="ml-1 text-xs text-red-500">Low</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      ${fmt(item.costPrice)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      ${fmt(item.quantityOnHand * item.costPrice)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          Inactive
                        </span>
                      )}
                      {item.isTracked && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          Tracked
                        </span>
                      )}
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
