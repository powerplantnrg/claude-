"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface Asset {
  id: string
  assetNumber: string
  name: string
  category: string
  purchaseDate: string
  purchasePrice: number
  currentBookValue: number
  status: string
  depreciationMethod: string
  isRdAsset: boolean
  location: string | null
  rdProject: { id: string; name: string } | null
}

interface Summary {
  totalAssets: number
  totalPurchasePrice: number
  totalBookValue: number
  accumulatedDepreciation: number
  rdAssetsCount: number
  rdAssetsValue: number
}

const statusBadge: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Disposed: "bg-red-100 text-red-700",
  "Written Off": "bg-gray-100 text-gray-700",
}

const categories = [
  "Equipment",
  "Furniture",
  "Vehicles",
  "IT Hardware",
  "Software",
  "Laboratory",
  "Building",
  "Leasehold Improvements",
  "Other",
]

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [runningDepreciation, setRunningDepreciation] = useState(false)

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const fetchAssets = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (categoryFilter) params.set("category", categoryFilter)
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/assets?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setAssets(data.assets)
        setSummary(data.summary)
      }
    } catch {
      toast.error("Error", "Failed to load assets")
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, statusFilter])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const handleRunDepreciation = async () => {
    if (
      !confirm(
        "This will run monthly depreciation for all active assets. Continue?"
      )
    ) {
      return
    }

    setRunningDepreciation(true)
    try {
      const now = new Date()
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const res = await fetch("/api/assets/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodEnd: periodEnd.toISOString().split("T")[0],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(
          "Depreciation Complete",
          data.message || `Processed ${data.processed} assets`
        )
        fetchAssets()
      } else {
        const data = await res.json()
        toast.error("Error", data.error || "Failed to run depreciation")
      }
    } catch {
      toast.error("Error", "Failed to run depreciation")
    } finally {
      setRunningDepreciation(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fixed Assets</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your organization&apos;s fixed assets and depreciation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunDepreciation}
            disabled={runningDepreciation}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {runningDepreciation && (
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
            Run Depreciation
          </button>
          <Link
            href="/assets/new"
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
            Add Asset
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Assets Value
            </dt>
            <dd className="mt-2 text-2xl font-bold text-slate-900">
              ${fmt(summary.totalPurchasePrice)}
            </dd>
            <p className="mt-1 text-xs text-slate-500">
              {summary.totalAssets} active assets
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Accumulated Depreciation
            </dt>
            <dd className="mt-2 text-2xl font-bold text-orange-600">
              ${fmt(summary.accumulatedDepreciation)}
            </dd>
            <p className="mt-1 text-xs text-slate-500">Total depreciation to date</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Net Book Value
            </dt>
            <dd className="mt-2 text-2xl font-bold text-green-600">
              ${fmt(summary.totalBookValue)}
            </dd>
            <p className="mt-1 text-xs text-slate-500">Current carrying amount</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              R&D Assets
            </dt>
            <dd className="mt-2 text-2xl font-bold text-indigo-600">
              ${fmt(summary.rdAssetsValue)}
            </dd>
            <p className="mt-1 text-xs text-slate-500">
              {summary.rdAssetsCount} R&D eligible assets
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets..."
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Disposed">Disposed</option>
          <option value="Written Off">Written Off</option>
        </select>
        <Link
          href="/assets/reports"
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

      {/* Assets Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Asset #
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Category
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Purchase Date
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Purchase Price
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Book Value
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  R&D
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    Loading assets...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    No fixed assets found. Add your first asset to get started.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {asset.assetNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                      {asset.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {asset.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(asset.purchaseDate).toLocaleDateString("en-AU")}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      ${fmt(asset.purchasePrice)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      ${fmt(asset.currentBookValue)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusBadge[asset.status] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {asset.isRdAsset ? (
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          R&D
                          {asset.rdProject
                            ? ` - ${asset.rdProject.name}`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
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
