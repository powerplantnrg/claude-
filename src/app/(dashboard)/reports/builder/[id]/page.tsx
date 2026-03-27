"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import {
  FileText,
  Download,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  RefreshCw,
} from "lucide-react"

interface ColumnConfig {
  key: string
  label: string
}

interface ReportResult {
  templateId: string
  templateName: string
  baseReport: string
  period: { from: string; to: string }
  columns: ColumnConfig[]
  rows: Record<string, any>[]
  totals: Record<string, number>
  groupedData: any[] | null
  rowCount: number
  generatedAt: string
}

interface Template {
  id: string
  name: string
  description: string | null
  baseReport: string
  columns: ColumnConfig[]
  filters: Record<string, any>
  groupBy: string | null
  dateRange: string | null
  includeComparison: boolean
}

const BASE_REPORT_LABELS: Record<string, string> = {
  ProfitLoss: "Profit & Loss",
  BalanceSheet: "Balance Sheet",
  TrialBalance: "Trial Balance",
  CashFlow: "Cash Flow",
  Custom: "Custom",
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount)
}

export default function RunTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [template, setTemplate] = useState<Template | null>(null)
  const [result, setResult] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Custom date overrides
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await fetch(`/api/report-templates/${id}`)
      if (!res.ok) throw new Error("Failed to fetch template")
      const data = await res.json()
      setTemplate(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  const runReport = useCallback(async () => {
    setRunning(true)
    setError(null)

    try {
      const res = await fetch(`/api/report-templates/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(dateFrom && { from: dateFrom }),
          ...(dateTo && { to: dateTo }),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to run report")
      }

      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }, [id, dateFrom, dateTo])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  // Auto-run on load
  useEffect(() => {
    if (template && !result && !running) {
      runReport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template])

  function exportCSV() {
    if (!result || !result.rows.length) return

    const headers = result.columns.map((c) => c.label)
    const rows = result.rows.map((row) =>
      result.columns.map((col) => {
        const val = row[col.key]
        if (typeof val === "number") return val.toFixed(2)
        return val ?? ""
      })
    )

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(template?.name || "report").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="text-sm text-slate-500">Loading template...</span>
      </div>
    )
  }

  if (error && !template) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
        <Link
          href="/reports/builder/templates"
          className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to templates
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/reports/builder/templates"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">
                {template?.name}
              </h1>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                {BASE_REPORT_LABELS[template?.baseReport || ""] || template?.baseReport}
              </span>
            </div>
            {template?.description && (
              <p className="mt-1 text-sm text-slate-500">{template.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}
          <button
            onClick={runReport}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {running ? "Running..." : "Re-run"}
          </button>
        </div>
      </div>

      {/* Date Override */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Calendar className="h-4 w-4 text-slate-400" />
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">From:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">To:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <p className="text-xs text-slate-500">Leave blank for template default</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {running ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Generating report...</p>
          </div>
        ) : !result ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <FileText className="h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">Report will appear here</p>
          </div>
        ) : result.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <AlertCircle className="h-8 w-8 text-amber-400" />
            <p className="text-sm text-slate-500">No data found for the selected criteria</p>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200 px-6 py-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {result.rowCount} rows &middot; Period:{" "}
                {new Date(result.period.from).toLocaleDateString("en-AU")} -{" "}
                {new Date(result.period.to).toLocaleDateString("en-AU")} &middot; Generated{" "}
                {new Date(result.generatedAt).toLocaleString("en-AU")}
              </p>
            </div>
            {result.groupedData ? (
              <div className="divide-y divide-slate-200">
                {result.groupedData.map((group: any, gi: number) => (
                  <div key={gi}>
                    <div className="bg-slate-50 px-6 py-2">
                      <p className="text-sm font-semibold text-slate-700">{group.label}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            {result.columns.map((col) => (
                              <th
                                key={col.key}
                                className={`px-4 py-2 text-xs font-medium text-slate-500 ${
                                  col.key === "account" ? "text-left" : "text-right"
                                }`}
                              >
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {group.rows.map((row: any, ri: number) => (
                            <tr key={ri}>
                              {result.columns.map((col) => (
                                <td
                                  key={col.key}
                                  className={`px-4 py-2 ${
                                    col.key === "account"
                                      ? "text-left text-slate-900"
                                      : "text-right font-mono text-slate-700"
                                  }`}
                                >
                                  {col.key === "account"
                                    ? row.account || `${row.code} - ${row.name}`
                                    : typeof row[col.key] === "number"
                                    ? col.key === "percentage"
                                      ? `${row[col.key].toFixed(1)}%`
                                      : formatCurrency(row[col.key])
                                    : row[col.key] ?? "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {result.columns.map((col) => (
                        <th
                          key={col.key}
                          className={`px-4 py-3 text-xs font-medium text-slate-600 ${
                            col.key === "account" ? "text-left" : "text-right"
                          }`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {result.columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-2.5 ${
                              col.key === "account"
                                ? "text-left text-slate-900"
                                : "text-right font-mono text-slate-700"
                            }`}
                          >
                            {col.key === "account"
                              ? row.account || `${row.code} - ${row.name}`
                              : typeof row[col.key] === "number"
                              ? col.key === "percentage"
                                ? `${row[col.key].toFixed(1)}%`
                                : formatCurrency(row[col.key])
                              : row[col.key] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                      {result.columns.map((col, ci) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 ${
                            ci === 0 ? "text-left text-slate-900" : "text-right font-mono text-slate-900"
                          }`}
                        >
                          {ci === 0
                            ? "Total"
                            : result.totals[col.key] !== undefined
                            ? col.key === "percentage"
                              ? ""
                              : formatCurrency(result.totals[col.key])
                            : ""}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
