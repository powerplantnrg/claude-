"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

type ReportType = "valuation" | "movement-summary" | "reorder"

interface ValuationItem {
  id: string
  sku: string
  name: string
  category: string
  quantityOnHand: number
  costPrice: number
  sellingPrice: number
  totalCostValue: number
  totalSellingValue: number
  unitOfMeasure: string
}

interface ReorderItem {
  id: string
  sku: string
  name: string
  category: string
  quantityOnHand: number
  reorderLevel: number
  reorderQuantity: number | null
  costPrice: number
  shortfall: number
  suggestedOrder: number
  estimatedCost: number
  unitOfMeasure: string
}

interface MovementByItem {
  name: string
  sku: string
  inQty: number
  outQty: number
  netQty: number
}

export default function InventoryReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("valuation")
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Valuation state
  const [valuationItems, setValuationItems] = useState<ValuationItem[]>([])
  const [valuationSummary, setValuationSummary] = useState<any>(null)
  const [valuationByCategory, setValuationByCategory] = useState<Record<string, any>>({})

  // Movement summary state
  const [movementByType, setMovementByType] = useState<Record<string, any>>({})
  const [movementByItem, setMovementByItem] = useState<MovementByItem[]>([])
  const [totalMovements, setTotalMovements] = useState(0)

  // Reorder state
  const [reorderItems, setReorderItems] = useState<ReorderItem[]>([])
  const [reorderSummary, setReorderSummary] = useState<any>(null)

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("type", reportType)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)

      const res = await fetch(`/api/inventory/reports?${params.toString()}`)
      if (!res.ok) {
        toast.error("Error", "Failed to load report")
        return
      }

      const data = await res.json()

      if (reportType === "valuation") {
        setValuationItems(data.items || [])
        setValuationSummary(data.summary || null)
        setValuationByCategory(data.byCategory || {})
      } else if (reportType === "movement-summary") {
        setMovementByType(data.byType || {})
        setMovementByItem(data.byItem || [])
        setTotalMovements(data.totalMovements || 0)
      } else if (reportType === "reorder") {
        setReorderItems(data.items || [])
        setReorderSummary(data.summary || null)
      }
    } catch {
      toast.error("Error", "Failed to load report")
    } finally {
      setLoading(false)
    }
  }, [reportType, dateFrom, dateTo])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Stock valuation, movement summaries, and reorder reports
          </p>
        </div>
        <Link
          href="/inventory"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Back to Inventory
        </Link>
      </div>

      {/* Report Type Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex rounded-lg border border-slate-300 bg-white shadow-sm overflow-hidden">
          {(
            [
              { key: "valuation", label: "Valuation" },
              { key: "movement-summary", label: "Movement Summary" },
              { key: "reorder", label: "Reorder" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setReportType(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                reportType === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {reportType === "movement-summary" && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </>
        )}
      </div>

      {loading && (
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">
          Loading report...
        </div>
      )}

      {/* Valuation Report */}
      {!loading && reportType === "valuation" && (
        <>
          {/* Summary Cards */}
          {valuationSummary && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Total Items
                </dt>
                <dd className="mt-2 text-2xl font-bold text-slate-900">
                  {valuationSummary.totalItems}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Total Cost Value
                </dt>
                <dd className="mt-2 text-2xl font-bold text-slate-900">
                  ${fmt(valuationSummary.totalCostValue)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Total Selling Value
                </dt>
                <dd className="mt-2 text-2xl font-bold text-green-600">
                  ${fmt(valuationSummary.totalSellingValue)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Potential Profit
                </dt>
                <dd className="mt-2 text-2xl font-bold text-indigo-600">
                  ${fmt(valuationSummary.potentialProfit)}
                </dd>
              </div>
            </div>
          )}

          {/* By Category */}
          {Object.keys(valuationByCategory).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Valuation by Category</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Category
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Items
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Cost Value
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Selling Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(valuationByCategory).map(([cat, data]: [string, any]) => (
                      <tr key={cat} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{cat}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">{data.count}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                          ${fmt(data.costValue)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                          ${fmt(data.sellingValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Item Details */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Item Valuation Details</h2>
            </div>
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
                      Qty
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Cost Price
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total Cost
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total Selling
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {valuationItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                        No tracked inventory items found.
                      </td>
                    </tr>
                  ) : (
                    valuationItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">
                          <Link href={`/inventory/${item.id}`}>{item.sku}</Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{item.category}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-900">
                          {item.quantityOnHand}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">
                          ${fmt(item.costPrice)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                          ${fmt(item.totalCostValue)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                          ${fmt(item.totalSellingValue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Movement Summary Report */}
      {!loading && reportType === "movement-summary" && (
        <>
          {/* By Type Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Movements
              </dt>
              <dd className="mt-2 text-2xl font-bold text-slate-900">
                {totalMovements}
              </dd>
            </div>
            {Object.entries(movementByType).map(([type, data]: [string, any]) => (
              <div key={type} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {type}
                </dt>
                <dd className="mt-2 text-2xl font-bold text-slate-900">{data.count}</dd>
                <p className="mt-1 text-xs text-slate-500">
                  {data.totalQuantity} units &middot; ${fmt(data.totalCost)}
                </p>
              </div>
            ))}
          </div>

          {/* By Item */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Movement by Item</h2>
            </div>
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
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      In
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Out
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movementByItem.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                        No movements found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    movementByItem.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.sku}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 text-right text-sm text-green-600 font-medium">
                          +{item.inQty}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-red-600 font-medium">
                          -{item.outQty}
                        </td>
                        <td className={`px-6 py-4 text-right text-sm font-bold ${
                          item.netQty >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {item.netQty >= 0 ? `+${item.netQty}` : item.netQty}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Reorder Report */}
      {!loading && reportType === "reorder" && (
        <>
          {reorderSummary && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Items to Reorder
                </dt>
                <dd className="mt-2 text-2xl font-bold text-red-600">
                  {reorderSummary.totalItemsToReorder}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Estimated Reorder Cost
                </dt>
                <dd className="mt-2 text-2xl font-bold text-slate-900">
                  ${fmt(reorderSummary.totalEstimatedCost)}
                </dd>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Items Below Reorder Level</h2>
            </div>
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
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      On Hand
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Reorder Level
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Shortfall
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Suggested Order
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Est. Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reorderItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                        All items are above their reorder levels.
                      </td>
                    </tr>
                  ) : (
                    reorderItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">
                          <Link href={`/inventory/${item.id}`}>{item.sku}</Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 text-right text-sm text-red-600 font-medium">
                          {item.quantityOnHand}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">
                          {item.reorderLevel}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-red-600 font-medium">
                          {item.shortfall}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                          {item.suggestedOrder}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                          ${fmt(item.estimatedCost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
