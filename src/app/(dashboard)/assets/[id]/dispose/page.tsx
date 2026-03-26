"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface Asset {
  id: string
  assetNumber: string
  name: string
  purchasePrice: number
  currentBookValue: number
  status: string
}

const disposalMethods = [
  { value: "Sale", label: "Sale" },
  { value: "Scrapped", label: "Scrapped" },
  { value: "Donated", label: "Donated" },
  { value: "Stolen", label: "Stolen / Lost" },
  { value: "Trade-In", label: "Trade-In" },
  { value: "Other", label: "Other" },
]

export default function DisposeAssetPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [disposalDate, setDisposalDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [disposalPrice, setDisposalPrice] = useState("0")
  const [disposalMethod, setDisposalMethod] = useState("Sale")

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  useEffect(() => {
    fetch(`/api/assets/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setAsset(null)
        } else {
          setAsset(data)
        }
      })
      .catch(() => setAsset(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">
        Loading asset...
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="space-y-4 text-center py-24">
        <p className="text-sm text-slate-500">Asset not found.</p>
        <Link href="/assets" className="text-sm text-blue-600 hover:text-blue-800">
          Back to Assets
        </Link>
      </div>
    )
  }

  if (asset.status !== "Active") {
    return (
      <div className="space-y-4 text-center py-24">
        <p className="text-sm text-slate-500">
          This asset is already {asset.status.toLowerCase()} and cannot be disposed.
        </p>
        <Link
          href={`/assets/${id}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Back to Asset
        </Link>
      </div>
    )
  }

  const gainLoss = parseFloat(disposalPrice || "0") - asset.currentBookValue

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!disposalDate) {
      setError("Disposal date is required.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dispose",
          disposalDate,
          disposalPrice: parseFloat(disposalPrice || "0"),
          disposalMethod,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to dispose asset.")
        toast.error("Error", data.error || "Failed to dispose asset.")
        return
      }

      toast.success(
        "Asset Disposed",
        `${asset.assetNumber} has been disposed via ${disposalMethod.toLowerCase()}.`
      )
      router.push(`/assets/${id}`)
    } catch {
      setError("An unexpected error occurred.")
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispose Asset</h1>
          <p className="mt-1 text-sm text-slate-500">
            {asset.assetNumber} - {asset.name}
          </p>
        </div>
        <Link
          href={`/assets/${id}`}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Asset Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Current Asset Value</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Purchase Price
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              ${fmt(asset.purchasePrice)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Accumulated Depreciation
            </dt>
            <dd className="mt-1 text-sm font-medium text-orange-600">
              ${fmt(asset.purchasePrice - asset.currentBookValue)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Current Book Value
            </dt>
            <dd className="mt-1 text-sm font-bold text-green-600">
              ${fmt(asset.currentBookValue)}
            </dd>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Disposal Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Disposal Details
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Disposal Date *
              </label>
              <input
                type="date"
                value={disposalDate}
                onChange={(e) => setDisposalDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Disposal Method *
              </label>
              <select
                value={disposalMethod}
                onChange={(e) => setDisposalMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {disposalMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Disposal Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={disposalPrice}
                onChange={(e) => setDisposalPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Gain/Loss Preview */}
        <div
          className={`rounded-xl border p-6 shadow-sm ${
            gainLoss >= 0
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <h2
            className={`mb-3 text-sm font-semibold ${
              gainLoss >= 0 ? "text-green-900" : "text-red-900"
            }`}
          >
            {gainLoss >= 0 ? "Gain on Disposal" : "Loss on Disposal"}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <dt
                className={`text-xs font-medium uppercase tracking-wider ${
                  gainLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                Disposal Price
              </dt>
              <dd
                className={`mt-1 text-sm font-medium ${
                  gainLoss >= 0 ? "text-green-900" : "text-red-900"
                }`}
              >
                ${fmt(parseFloat(disposalPrice || "0"))}
              </dd>
            </div>
            <div>
              <dt
                className={`text-xs font-medium uppercase tracking-wider ${
                  gainLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                Book Value
              </dt>
              <dd
                className={`mt-1 text-sm font-medium ${
                  gainLoss >= 0 ? "text-green-900" : "text-red-900"
                }`}
              >
                ${fmt(asset.currentBookValue)}
              </dd>
            </div>
            <div>
              <dt
                className={`text-xs font-medium uppercase tracking-wider ${
                  gainLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {gainLoss >= 0 ? "Gain" : "Loss"}
              </dt>
              <dd
                className={`mt-1 text-lg font-bold ${
                  gainLoss >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                ${fmt(Math.abs(gainLoss))}
              </dd>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href={`/assets/${id}`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && (
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
            {submitting ? "Disposing..." : "Confirm Disposal"}
          </button>
        </div>
      </form>
    </div>
  )
}
