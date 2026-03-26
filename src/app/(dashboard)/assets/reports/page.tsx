"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface RegisterAsset {
  id: string
  assetNumber: string
  name: string
  category: string
  purchaseDate: string
  purchasePrice: number
  currentBookValue: number
  status: string
  depreciationMethod: string
  usefulLifeYears: number
  residualValue: number
  isRdAsset: boolean
  location: string | null
  account: { name: string; code: string } | null
  rdProject: { id: string; name: string } | null
}

interface ForecastMonth {
  month: string
  totalDepreciation: number
  totalBookValue: number
  assetBreakdown: {
    assetId: string
    assetNumber: string
    name: string
    depreciation: number
    bookValue: number
  }[]
}

interface RdAsset {
  id: string
  assetNumber: string
  name: string
  category: string
  purchasePrice: number
  currentBookValue: number
  status: string
  rdProject: { id: string; name: string } | null
}

interface RdSummary {
  totalRdAssets: number
  activeRdAssets: number
  totalRdAssetCost: number
  totalRdBookValue: number
  totalRdDepreciation: number
  byProject: {
    projectId: string
    projectName: string
    assetCount: number
    totalCost: number
    totalBookValue: number
  }[]
}

type ReportType = "register" | "depreciation-forecast" | "rd-assets"

export default function AssetReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("register")
  const [loading, setLoading] = useState(false)
  const [registerData, setRegisterData] = useState<{
    assets: RegisterAsset[]
    summary: any
  } | null>(null)
  const [forecastData, setForecastData] = useState<{
    forecast: ForecastMonth[]
  } | null>(null)
  const [rdData, setRdData] = useState<{
    assets: RdAsset[]
    summary: RdSummary
  } | null>(null)

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const loadReport = async (type: ReportType) => {
    setActiveReport(type)
    setLoading(true)
    try {
      const res = await fetch(`/api/assets/reports?type=${type}`)
      if (!res.ok) {
        toast.error("Error", "Failed to load report")
        return
      }
      const data = await res.json()
      if (type === "register") setRegisterData(data)
      else if (type === "depreciation-forecast") setForecastData(data)
      else if (type === "rd-assets") setRdData(data)
    } catch {
      toast.error("Error", "Failed to load report")
    } finally {
      setLoading(false)
    }
  }

  const reports = [
    {
      type: "register" as ReportType,
      label: "Asset Register",
      description: "Complete listing of all fixed assets with current values",
    },
    {
      type: "depreciation-forecast" as ReportType,
      label: "Depreciation Forecast",
      description: "12-month forward projection of depreciation and book values",
    },
    {
      type: "rd-assets" as ReportType,
      label: "R&D Assets Summary",
      description: "Assets eligible for R&D tax offset claims",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate reports on fixed assets, depreciation, and R&D eligibility
          </p>
        </div>
        <Link
          href="/assets"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Back to Assets
        </Link>
      </div>

      {/* Report Selection */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {reports.map((report) => (
          <button
            key={report.type}
            onClick={() => loadReport(report.type)}
            className={`rounded-xl border p-5 text-left shadow-sm transition-colors ${
              activeReport === report.type
                ? "border-blue-300 bg-blue-50"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <h3
              className={`text-sm font-semibold ${
                activeReport === report.type
                  ? "text-blue-900"
                  : "text-slate-900"
              }`}
            >
              {report.label}
            </h3>
            <p
              className={`mt-1 text-xs ${
                activeReport === report.type
                  ? "text-blue-600"
                  : "text-slate-500"
              }`}
            >
              {report.description}
            </p>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-sm text-slate-400">
          Loading report...
        </div>
      )}

      {/* Asset Register Report */}
      {!loading && activeReport === "register" && registerData && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Assets
              </dt>
              <dd className="mt-1 text-lg font-bold text-slate-900">
                {registerData.summary.totalAssets}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Active
              </dt>
              <dd className="mt-1 text-lg font-bold text-green-600">
                {registerData.summary.activeAssets}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Disposed
              </dt>
              <dd className="mt-1 text-lg font-bold text-red-600">
                {registerData.summary.disposedAssets}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Cost
              </dt>
              <dd className="mt-1 text-lg font-bold text-slate-900">
                ${fmt(registerData.summary.totalCost)}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Net Book Value
              </dt>
              <dd className="mt-1 text-lg font-bold text-green-600">
                ${fmt(registerData.summary.totalBookValue)}
              </dd>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Asset #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Method
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Accum. Dep.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Book Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registerData.assets.map((asset) => (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/assets/${asset.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {asset.assetNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {asset.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {asset.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {asset.depreciationMethod === "StraightLine"
                          ? "SL"
                          : "DV"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">
                        ${fmt(asset.purchasePrice)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-orange-600">
                        ${fmt(asset.purchasePrice - asset.currentBookValue)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                        ${fmt(asset.currentBookValue)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            asset.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {asset.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Depreciation Forecast Report */}
      {!loading && activeReport === "depreciation-forecast" && forecastData && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              12-Month Depreciation Forecast
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Month
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Depreciation
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Book Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Assets
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forecastData.forecast.map((month, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">
                      {month.month}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-orange-600 font-medium">
                      ${fmt(month.totalDepreciation)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-slate-900 font-medium">
                      ${fmt(month.totalBookValue)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-slate-600">
                      {month.assetBreakdown.filter((a) => a.depreciation > 0).length}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="px-6 py-3 text-sm font-semibold text-slate-900">
                    12-Month Total
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-orange-600">
                    $
                    {fmt(
                      forecastData.forecast.reduce(
                        (sum, m) => sum + m.totalDepreciation,
                        0
                      )
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">
                    {forecastData.forecast.length > 0
                      ? `$${fmt(forecastData.forecast[forecastData.forecast.length - 1].totalBookValue)}`
                      : "-"}
                  </td>
                  <td className="px-6 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* R&D Assets Report */}
      {!loading && activeReport === "rd-assets" && rdData && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                R&D Assets
              </dt>
              <dd className="mt-1 text-lg font-bold text-indigo-900">
                {rdData.summary.activeRdAssets}
              </dd>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                Total Cost
              </dt>
              <dd className="mt-1 text-lg font-bold text-indigo-900">
                ${fmt(rdData.summary.totalRdAssetCost)}
              </dd>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                Book Value
              </dt>
              <dd className="mt-1 text-lg font-bold text-indigo-900">
                ${fmt(rdData.summary.totalRdBookValue)}
              </dd>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                Total Depreciation
              </dt>
              <dd className="mt-1 text-lg font-bold text-indigo-900">
                ${fmt(rdData.summary.totalRdDepreciation)}
              </dd>
            </div>
          </div>

          {/* By Project */}
          {rdData.summary.byProject.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  By R&D Project
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Project
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Assets
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Total Cost
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Book Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rdData.summary.byProject.map((proj) => (
                      <tr
                        key={proj.projectId}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">
                          {proj.projectId !== "unassigned" ? (
                            <Link
                              href={`/rd/projects/${proj.projectId}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {proj.projectName}
                            </Link>
                          ) : (
                            proj.projectName
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-sm text-slate-600">
                          {proj.assetCount}
                        </td>
                        <td className="px-6 py-3 text-right text-sm text-slate-900">
                          ${fmt(proj.totalCost)}
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                          ${fmt(proj.totalBookValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Assets List */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                R&D Eligible Assets
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Asset #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Project
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Book Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rdData.assets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-sm text-slate-400"
                      >
                        No R&D eligible assets found.
                      </td>
                    </tr>
                  ) : (
                    rdData.assets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-3 text-sm">
                          <Link
                            href={`/assets/${asset.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {asset.assetNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-900">
                          {asset.name}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-600">
                          {asset.category}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-600">
                          {asset.rdProject ? (
                            <Link
                              href={`/rd/projects/${asset.rdProject.id}`}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              {asset.rdProject.name}
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-sm text-slate-900">
                          ${fmt(asset.purchasePrice)}
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                          ${fmt(asset.currentBookValue)}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              asset.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {asset.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Initial state - no report loaded yet */}
      {!loading &&
        !registerData &&
        !forecastData &&
        !rdData && (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">
            Select a report type above to generate
          </div>
        )}
    </div>
  )
}
