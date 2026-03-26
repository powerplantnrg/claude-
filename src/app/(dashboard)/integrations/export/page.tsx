"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

const FORMATS = [
  {
    id: "xero-csv",
    name: "Xero CSV",
    description: "Compatible with Xero import",
    color: "bg-blue-100 text-blue-700",
    iconColor: "text-blue-600",
    icon: "X",
  },
  {
    id: "myob-csv",
    name: "MYOB CSV",
    description: "Compatible with MYOB import",
    color: "bg-purple-100 text-purple-700",
    iconColor: "text-purple-600",
    icon: "M",
  },
  {
    id: "generic-csv",
    name: "Generic CSV",
    description: "Universal CSV format",
    color: "bg-slate-100 text-slate-700",
    iconColor: "text-slate-600",
    icon: "CSV",
  },
]

const DATA_TYPES = [
  {
    id: "accounts",
    name: "Chart of Accounts",
    description: "All accounts with codes, types, and tax settings",
  },
  {
    id: "contacts",
    name: "Contacts",
    description: "Customers, suppliers, and contractors",
  },
  {
    id: "transactions",
    name: "Bank Transactions",
    description: "Bank transaction history with reconciliation status",
  },
]

export default function ExportPage() {
  const searchParams = useSearchParams()
  const initialFormat = searchParams.get("format") || ""

  const [format, setFormat] = useState(initialFormat)
  const [dataType, setDataType] = useState("accounts")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [preview, setPreview] = useState("")
  const [loading, setLoading] = useState(false)

  async function handlePreview() {
    if (!format) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ format, dataType })
      if (dataType === "transactions") {
        if (startDate) params.set("startDate", startDate)
        if (endDate) params.set("endDate", endDate)
      }
      const res = await fetch(`/api/integrations/export?${params}`)
      if (res.ok) {
        const text = await res.text()
        setPreview(text)
      } else {
        const data = await res.json()
        setPreview(`Error: ${data.error}`)
      }
    } catch {
      setPreview("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!format) return
    const params = new URLSearchParams({ format, dataType })
    if (dataType === "transactions") {
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
    }
    window.open(`/api/integrations/export?${params}`, "_blank")
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/integrations" className="hover:text-slate-700">
          Integrations
        </Link>
        <span>/</span>
        <span className="text-slate-900">Data Export</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Data Export</h1>
        <p className="mt-1 text-sm text-slate-500">
          Export your data in formats compatible with Xero, MYOB, or as generic CSV
        </p>
      </div>

      {/* Format Selection */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Select Format</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`rounded-xl border p-5 text-left shadow-sm transition-all ${
                format === f.id
                  ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-slate-200 bg-white hover:shadow-md"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${f.id === format ? "bg-indigo-100" : f.color.split(" ")[0]}`}
                >
                  <span
                    className={`text-sm font-bold ${f.id === format ? "text-indigo-600" : f.iconColor}`}
                  >
                    {f.icon}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{f.name}</p>
                  <p className="text-xs text-slate-500">{f.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Data Type Selection */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Select Data Type</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {DATA_TYPES.map((dt) => (
            <button
              key={dt.id}
              onClick={() => setDataType(dt.id)}
              className={`rounded-xl border p-5 text-left shadow-sm transition-all ${
                dataType === dt.id
                  ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-slate-200 bg-white hover:shadow-md"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{dt.name}</p>
              <p className="mt-1 text-xs text-slate-500">{dt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Date Range (for transactions) */}
      {dataType === "transactions" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Date Range
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePreview}
          disabled={!format || loading}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading Preview..." : "Preview"}
        </button>
        <button
          onClick={handleDownload}
          disabled={!format}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Download CSV
        </button>
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Preview</h2>
          <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-4 shadow-sm">
            <pre className="text-xs text-green-400 leading-relaxed whitespace-pre">
              {preview.split("\n").slice(0, 20).join("\n")}
              {preview.split("\n").length > 20 && (
                <span className="text-slate-500">
                  {"\n"}... {preview.split("\n").length - 20} more rows
                </span>
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
