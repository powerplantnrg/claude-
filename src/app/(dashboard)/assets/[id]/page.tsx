"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"

const DepreciationChart = dynamic(() => import("./depreciation-chart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-slate-400">
      Loading chart...
    </div>
  ),
})

interface DepreciationSchedule {
  id: string
  periodStart: string
  periodEnd: string
  openingValue: number
  depreciationAmount: number
  accumulatedDepreciation: number
  closingValue: number
  status: string
  journalEntry: { id: string; entryNumber: number } | null
}

interface Asset {
  id: string
  assetNumber: string
  name: string
  description: string | null
  category: string
  purchaseDate: string
  purchasePrice: number
  residualValue: number
  usefulLifeYears: number
  depreciationMethod: string
  currentBookValue: number
  status: string
  disposalDate: string | null
  disposalPrice: number | null
  disposalMethod: string | null
  location: string | null
  serialNumber: string | null
  supplier: string | null
  warrantyExpiry: string | null
  isRdAsset: boolean
  notes: string | null
  account: { id: string; name: string; code: string } | null
  depreciationAccount: { id: string; name: string; code: string } | null
  accumulatedDepreciationAccount: { id: string; name: string; code: string } | null
  rdProject: { id: string; name: string } | null
  depreciationSchedules: DepreciationSchedule[]
}

const statusBadge: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Disposed: "bg-red-100 text-red-700",
  "Written Off": "bg-gray-100 text-gray-700",
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)

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

  const accumulatedDepreciation = asset.purchasePrice - asset.currentBookValue
  const depreciationPercent =
    asset.purchasePrice > 0
      ? ((accumulatedDepreciation / asset.purchasePrice) * 100).toFixed(1)
      : "0"

  const gainLoss =
    asset.status === "Disposed" && asset.disposalPrice !== null
      ? asset.disposalPrice - asset.currentBookValue
      : null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {asset.assetNumber}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                statusBadge[asset.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {asset.status}
            </span>
            {asset.isRdAsset && (
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                R&D Asset
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{asset.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {asset.status === "Active" && (
            <Link
              href={`/assets/${asset.id}/dispose`}
              className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 transition-colors"
            >
              Dispose Asset
            </Link>
          )}
          <Link
            href="/assets"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Back to Assets
          </Link>
        </div>
      </div>

      {/* Overview Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Purchase Price
            </dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">
              ${fmt(asset.purchasePrice)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Current Book Value
            </dt>
            <dd className="mt-1 text-lg font-bold text-green-600">
              ${fmt(asset.currentBookValue)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Accumulated Depreciation
            </dt>
            <dd className="mt-1 text-lg font-bold text-orange-600">
              ${fmt(accumulatedDepreciation)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Depreciated
            </dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">
              {depreciationPercent}%
            </dd>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Category
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{asset.category}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Purchase Date
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {new Date(asset.purchaseDate).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Depreciation Method
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {asset.depreciationMethod === "StraightLine"
                  ? "Straight Line"
                  : "Diminishing Value"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Useful Life
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {asset.usefulLifeYears} years
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Residual Value
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                ${fmt(asset.residualValue)}
              </dd>
            </div>
            {asset.location && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Location
                </dt>
                <dd className="mt-1 text-sm text-slate-900">{asset.location}</dd>
              </div>
            )}
            {asset.serialNumber && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Serial Number
                </dt>
                <dd className="mt-1 text-sm text-slate-900">{asset.serialNumber}</dd>
              </div>
            )}
            {asset.supplier && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Supplier
                </dt>
                <dd className="mt-1 text-sm text-slate-900">{asset.supplier}</dd>
              </div>
            )}
            {asset.warrantyExpiry && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Warranty Expiry
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {new Date(asset.warrantyExpiry).toLocaleDateString("en-AU")}
                </dd>
              </div>
            )}
          </div>
        </div>

        {asset.description && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Description
            </dt>
            <dd className="mt-1 text-sm text-slate-700">{asset.description}</dd>
          </div>
        )}

        {asset.notes && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Notes
            </dt>
            <dd className="mt-1 text-sm text-slate-700">{asset.notes}</dd>
          </div>
        )}
      </div>

      {/* Account Information */}
      {(asset.account || asset.depreciationAccount || asset.accumulatedDepreciationAccount) && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Account Mapping</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {asset.account && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Asset Account
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {asset.account.code} - {asset.account.name}
                </dd>
              </div>
            )}
            {asset.depreciationAccount && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Depreciation Expense
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {asset.depreciationAccount.code} - {asset.depreciationAccount.name}
                </dd>
              </div>
            )}
            {asset.accumulatedDepreciationAccount && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Accumulated Depreciation
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {asset.accumulatedDepreciationAccount.code} -{" "}
                  {asset.accumulatedDepreciationAccount.name}
                </dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* R&D Eligibility */}
      {asset.isRdAsset && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-indigo-900">
            R&D Tax Incentive Eligibility
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                R&D Eligible
              </dt>
              <dd className="mt-1 text-sm font-medium text-indigo-900">Yes</dd>
            </div>
            {asset.rdProject && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                  Linked Project
                </dt>
                <dd className="mt-1 text-sm text-indigo-900">
                  <Link
                    href={`/rd/projects/${asset.rdProject.id}`}
                    className="font-medium text-indigo-700 hover:text-indigo-900 underline"
                  >
                    {asset.rdProject.name}
                  </Link>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                Claimable Depreciation
              </dt>
              <dd className="mt-1 text-sm font-medium text-indigo-900">
                ${fmt(accumulatedDepreciation)}
              </dd>
            </div>
          </div>
        </div>
      )}

      {/* Disposal Section */}
      {asset.status === "Disposed" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-red-900">
            Disposal Information
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-red-600">
                Disposal Date
              </dt>
              <dd className="mt-1 text-sm text-red-900">
                {asset.disposalDate
                  ? new Date(asset.disposalDate).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-red-600">
                Disposal Method
              </dt>
              <dd className="mt-1 text-sm text-red-900">
                {asset.disposalMethod || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-red-600">
                Disposal Price
              </dt>
              <dd className="mt-1 text-sm font-medium text-red-900">
                ${asset.disposalPrice !== null ? fmt(asset.disposalPrice) : "0.00"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-red-600">
                Gain / Loss
              </dt>
              <dd
                className={`mt-1 text-sm font-medium ${
                  gainLoss !== null && gainLoss >= 0
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {gainLoss !== null
                  ? `${gainLoss >= 0 ? "Gain" : "Loss"}: $${fmt(Math.abs(gainLoss))}`
                  : "-"}
              </dd>
            </div>
          </div>
        </div>
      )}

      {/* Depreciation Chart */}
      {asset.depreciationSchedules.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Book Value Over Time
          </h2>
          <DepreciationChart
            schedules={asset.depreciationSchedules}
            purchasePrice={asset.purchasePrice}
          />
        </div>
      )}

      {/* Depreciation Schedule Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Depreciation Schedule
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Period
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Opening Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Depreciation
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Accumulated
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Closing Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Journal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {asset.depreciationSchedules.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-sm text-slate-400"
                  >
                    No depreciation entries yet. Run depreciation to generate
                    schedule.
                  </td>
                </tr>
              ) : (
                asset.depreciationSchedules.map((sched) => (
                  <tr
                    key={sched.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm text-slate-900">
                      {new Date(sched.periodStart).toLocaleDateString("en-AU", {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-slate-900">
                      ${fmt(sched.openingValue)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-orange-600">
                      ${fmt(sched.depreciationAmount)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-slate-600">
                      ${fmt(sched.accumulatedDepreciation)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                      ${fmt(sched.closingValue)}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {sched.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {sched.journalEntry ? (
                        <span className="text-xs text-blue-600 font-medium">
                          #{sched.journalEntry.entryNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
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
