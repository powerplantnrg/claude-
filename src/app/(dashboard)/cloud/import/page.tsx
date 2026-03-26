"use client"

import { useState } from "react"
import Link from "next/link"
import { parseCSV, autoDetectColumns, mapColumns } from "@/lib/csv-import"

interface ImportResult {
  imported: number
  errors: { row: number; message: string }[]
}

const TARGET_FIELDS = ["date", "service", "amount", "currency", "provider", "tags"]

export default function CloudCostImportPage() {
  const [csvText, setCsvText] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState("")

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setResult(null)
    setError("")

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)

      const parsed = parseCSV(text)
      setHeaders(parsed.headers)
      setRows(parsed.rows)

      // Auto-detect column mapping
      const detected = autoDetectColumns(parsed.headers, TARGET_FIELDS)
      setColumnMapping(detected)
    }
    reader.readAsText(file)
  }

  function updateMapping(csvHeader: string, targetField: string) {
    setColumnMapping((prev) => {
      const next = { ...prev }
      // Remove any existing mapping to this target field
      for (const key of Object.keys(next)) {
        if (next[key] === targetField) {
          delete next[key]
        }
      }
      if (targetField) {
        next[csvHeader] = targetField
      } else {
        delete next[csvHeader]
      }
      return next
    })
  }

  async function handleImport() {
    setImporting(true)
    setResult(null)
    setError("")

    try {
      const mapper = mapColumns(headers, columnMapping)
      const entries = rows.map((row) => mapper(row))

      const res = await fetch("/api/cloud/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      })

      if (!res.ok) {
        const errData = await res.json()
        setError(errData.error || "Import failed")
        return
      }

      const data: ImportResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const previewRows = rows.slice(0, 5)
  const hasRequiredMappings = ["date", "service", "amount", "provider"].every(
    (f) => Object.values(columnMapping).includes(f)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Import Cloud Costs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload a CSV file to import cloud cost entries in bulk
          </p>
        </div>
        <Link
          href="/cloud"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* File Upload */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Upload CSV File
        </h2>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="mt-2 text-xs text-slate-400">
          Expected columns: Date, Service, Amount, Currency, Provider, Tags
        </p>
      </div>

      {/* Column Mapping */}
      {headers.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Column Mapping
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {headers.map((header) => (
              <div key={header} className="flex items-center gap-3">
                <span className="min-w-[120px] text-sm font-medium text-slate-700 truncate">
                  {header}
                </span>
                <select
                  value={
                    Object.entries(columnMapping).find(
                      ([k]) => k === header
                    )?.[1] || ""
                  }
                  onChange={(e) => updateMapping(header, e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Skip --</option>
                  {TARGET_FIELDS.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {!hasRequiredMappings && (
            <p className="mt-3 text-sm text-amber-600">
              Required mappings: date, service, amount, provider
            </p>
          )}
        </div>
      )}

      {/* Preview */}
      {previewRows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Preview (first {previewRows.length} rows of {rows.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  {headers.map((h) => (
                    <th key={h} className="px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2 text-sm text-slate-600">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Button */}
      {rows.length > 0 && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleImport}
            disabled={importing || !hasRequiredMappings}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? "Importing..." : `Import ${rows.length} Rows`}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Import Results
          </h2>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {result.imported}
              </p>
              <p className="text-sm text-slate-500">Imported</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {result.errors.length}
              </p>
              <p className="text-sm text-slate-500">Errors</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">
                Error Details
              </h3>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-red-100 bg-red-50 p-3">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">
                    Row {err.row}: {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
