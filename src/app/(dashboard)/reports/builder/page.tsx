"use client"

import { useState, useCallback } from "react"
import {
  LayoutDashboard,
  Plus,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Play,
  Save,
  Download,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react"

interface ColumnConfig {
  key: string
  label: string
}

interface FilterConfig {
  accountTypes: string[]
  costCenters: string[]
  accountIds: string[]
}

interface ReportRow {
  [key: string]: any
}

interface ReportResult {
  templateName: string
  baseReport: string
  period: { from: string; to: string }
  columns: ColumnConfig[]
  rows: ReportRow[]
  totals: Record<string, number>
  groupedData: any[] | null
  rowCount: number
  generatedAt: string
}

const BASE_REPORTS = [
  { value: "ProfitLoss", label: "Profit & Loss" },
  { value: "BalanceSheet", label: "Balance Sheet" },
  { value: "TrialBalance", label: "Trial Balance" },
  { value: "CashFlow", label: "Cash Flow" },
  { value: "Custom", label: "Custom" },
]

const AVAILABLE_COLUMNS = [
  { key: "account", label: "Account" },
  { key: "amount", label: "Amount" },
  { key: "debit", label: "Debit" },
  { key: "credit", label: "Credit" },
  { key: "budget", label: "Budget" },
  { key: "variance", label: "Variance" },
  { key: "percentage", label: "% Change" },
  { key: "priorPeriod", label: "Prior Period" },
]

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Revenue", "Expense"]

const GROUP_BY_OPTIONS = [
  { value: "", label: "No Grouping" },
  { value: "accountType", label: "Account Type" },
  { value: "costCenter", label: "Cost Center" },
  { value: "month", label: "Month" },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount)
}

export default function ReportBuilderPage() {
  // Config state
  const [name, setName] = useState("Untitled Report")
  const [description, setDescription] = useState("")
  const [baseReport, setBaseReport] = useState("ProfitLoss")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: "account", label: "Account" },
    { key: "amount", label: "Amount" },
  ])
  const [filters, setFilters] = useState<FilterConfig>({
    accountTypes: [],
    costCenters: [],
    accountIds: [],
  })
  const [groupBy, setGroupBy] = useState("")
  const [includeComparison, setIncludeComparison] = useState(false)
  const [isPublic, setIsPublic] = useState(false)

  // UI state
  const [result, setResult] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  function addColumn(key: string) {
    const col = AVAILABLE_COLUMNS.find((c) => c.key === key)
    if (!col || columns.some((c) => c.key === key)) return
    setColumns([...columns, { ...col }])
  }

  function removeColumn(key: string) {
    setColumns(columns.filter((c) => c.key !== key))
  }

  function moveColumn(index: number, direction: "up" | "down") {
    const newCols = [...columns]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newCols.length) return
    const temp = newCols[index]
    newCols[index] = newCols[targetIndex]
    newCols[targetIndex] = temp
    setColumns(newCols)
  }

  function toggleAccountType(type: string) {
    setFilters((prev) => ({
      ...prev,
      accountTypes: prev.accountTypes.includes(type)
        ? prev.accountTypes.filter((t) => t !== type)
        : [...prev.accountTypes, type],
    }))
  }

  const runPreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // First save as a temp template, then run it
      const templateRes = await fetch("/api/report-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `__preview_${Date.now()}`,
          description: "Preview template",
          baseReport,
          columns,
          filters,
          groupBy: groupBy || null,
          dateRange: dateFrom && dateTo ? `${dateFrom}:${dateTo}` : null,
          includeComparison,
          isPublic: false,
        }),
      })

      if (!templateRes.ok) {
        const data = await templateRes.json()
        throw new Error(data.error || "Failed to create preview template")
      }

      const template = await templateRes.json()

      // Run the template
      const runRes = await fetch(`/api/report-templates/${template.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(dateFrom && { from: dateFrom }),
          ...(dateTo && { to: dateTo }),
        }),
      })

      if (!runRes.ok) {
        const data = await runRes.json()
        throw new Error(data.error || "Failed to run report")
      }

      const data = await runRes.json()
      setResult(data)

      // Clean up preview template
      await fetch(`/api/report-templates/${template.id}`, { method: "DELETE" })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [baseReport, columns, filters, groupBy, dateFrom, dateTo, includeComparison])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/report-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          baseReport,
          columns,
          filters,
          groupBy: groupBy || null,
          dateRange: dateFrom && dateTo ? `${dateFrom}:${dateTo}` : null,
          includeComparison,
          isPublic,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save template")
      }

      setSuccess("Report template saved successfully")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

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
    a.download = `${name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const unusedColumns = AVAILABLE_COLUMNS.filter(
    (ac) => !columns.some((c) => c.key === ac.key)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Custom Report Builder</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure and build custom financial reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Template"}
          </button>
          <button
            onClick={runPreview}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {loading ? "Running..." : "Run Report"}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="space-y-4 lg:col-span-1">
          {/* Report Name */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Report Details</h3>
            <div>
              <label className="block text-xs font-medium text-slate-600">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isPublic" className="text-xs text-slate-600">
                Share with team
              </label>
            </div>
          </div>

          {/* Base Report */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Base Report</h3>
            <div className="grid grid-cols-1 gap-2">
              {BASE_REPORTS.map((br) => (
                <button
                  key={br.value}
                  onClick={() => setBaseReport(br.value)}
                  className={`rounded-lg border p-2 text-left text-sm transition-colors ${
                    baseReport === br.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500"
                      : "border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50"
                  }`}
                >
                  {br.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Date Range</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-slate-600">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Leave blank for current financial year
            </p>
          </div>

          {/* Columns */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Columns</h3>
            <div className="space-y-1">
              {columns.map((col, index) => (
                <div
                  key={col.key}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                  <span className="flex-1 text-sm text-slate-700">{col.label}</span>
                  <button
                    onClick={() => moveColumn(index, "up")}
                    disabled={index === 0}
                    className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveColumn(index, "down")}
                    disabled={index === columns.length - 1}
                    className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeColumn(col.key)}
                    className="p-0.5 text-slate-400 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {unusedColumns.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {unusedColumns.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => addColumn(col.key)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    {col.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex w-full items-center justify-between"
            >
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </h3>
              <span className="text-xs text-slate-500">
                {filters.accountTypes.length > 0 ? `${filters.accountTypes.length} active` : "None"}
              </span>
            </button>
            {showFilters && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Account Types
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCOUNT_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleAccountType(type)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          filters.accountTypes.includes(type)
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Group By */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Group By</h3>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {GROUP_BY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Comparison */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeComparison"
                checked={includeComparison}
                onChange={(e) => setIncludeComparison(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="includeComparison" className="text-sm font-medium text-slate-700">
                Include Prior Period Comparison
              </label>
            </div>
            <p className="mt-1 ml-6 text-xs text-slate-500">
              Compare with the same period from the prior year
            </p>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {result ? name : "Report Preview"}
                </h2>
                {result && (
                  <p className="text-xs text-slate-500">
                    {result.rowCount} rows &middot; Generated at{" "}
                    {new Date(result.generatedAt).toLocaleString("en-AU")}
                  </p>
                )}
              </div>
              {result && (
                <button
                  onClick={exportCSV}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm text-slate-500">Generating report...</p>
              </div>
            ) : !result ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <LayoutDashboard className="h-12 w-12 text-slate-300" />
                <p className="text-sm text-slate-500">
                  Configure your report and click &quot;Run Report&quot; to see results
                </p>
              </div>
            ) : result.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <AlertCircle className="h-8 w-8 text-amber-400" />
                <p className="text-sm text-slate-500">No data found for the selected criteria</p>
              </div>
            ) : result.groupedData ? (
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
                        <tfoot>
                          <tr className="bg-slate-50 font-semibold">
                            <td className="px-4 py-2 text-slate-900">
                              Subtotal
                            </td>
                            {result.columns.slice(1).map((col) => (
                              <td key={col.key} className="px-4 py-2 text-right font-mono text-slate-900">
                                {typeof group.total === "number" && col.key === "amount"
                                  ? formatCurrency(group.total)
                                  : ""}
                              </td>
                            ))}
                          </tr>
                        </tfoot>
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
          </div>
        </div>
      </div>
    </div>
  )
}
