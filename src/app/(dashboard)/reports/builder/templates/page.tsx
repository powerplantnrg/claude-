"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  FileText,
  Play,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  Globe,
  Lock,
  Loader2,
} from "lucide-react"

interface ReportTemplate {
  id: string
  name: string
  description: string | null
  baseReport: string
  columns: string
  filters: string
  groupBy: string | null
  dateRange: string | null
  includeComparison: boolean
  isPublic: boolean
  createdBy: { id: string; name: string; email: string } | null
  createdAt: string
}

const BASE_REPORT_LABELS: Record<string, string> = {
  ProfitLoss: "Profit & Loss",
  BalanceSheet: "Balance Sheet",
  TrialBalance: "Trial Balance",
  CashFlow: "Cash Flow",
  Custom: "Custom",
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/report-templates")
      if (!res.ok) throw new Error("Failed to fetch templates")
      const data = await res.json()
      setTemplates(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the template "${name}"?`)) return

    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/report-templates/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete template")
      }
      setSuccess(`Template "${name}" deleted`)
      await fetchTemplates()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function getBaseReportColor(baseReport: string) {
    switch (baseReport) {
      case "ProfitLoss":
        return "bg-green-100 text-green-800"
      case "BalanceSheet":
        return "bg-blue-100 text-blue-800"
      case "TrialBalance":
        return "bg-purple-100 text-purple-800"
      case "CashFlow":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-slate-100 text-slate-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Saved Report Templates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage and run your saved custom report templates
          </p>
        </div>
        <Link
          href="/reports/builder"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Report
        </Link>
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

      {/* Templates List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <span className="text-sm text-slate-500">Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <FileText className="h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">No saved templates yet</p>
            <Link
              href="/reports/builder"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create your first report
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {template.name}
                      </p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getBaseReportColor(template.baseReport)}`}>
                        {BASE_REPORT_LABELS[template.baseReport] || template.baseReport}
                      </span>
                      {template.isPublic ? (
                        <span aria-label="Public"><Globe className="h-3.5 w-3.5 text-slate-400" /></span>
                      ) : (
                        <span aria-label="Private"><Lock className="h-3.5 w-3.5 text-slate-400" /></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {template.description || "No description"}
                      {template.createdBy?.name ? ` - Created by ${template.createdBy.name}` : ""}
                      {template.createdAt ? ` on ${formatDate(template.createdAt)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Link
                    href={`/reports/builder/${template.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run
                  </Link>
                  <Link
                    href={`/reports/builder?edit=${template.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(template.id, template.name)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
