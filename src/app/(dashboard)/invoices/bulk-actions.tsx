"use client"

import { useState, useCallback } from "react"
import Link from "next/link"

interface InvoiceRow {
  id: string
  invoiceNumber: string
  contactName: string
  date: string
  dueDate: string
  status: string
  total: number
}

interface BulkResult {
  action: string
  updated: number
  failed: number
  errors: { id: string; invoiceNumber: string; message: string }[]
}

const statusBadge: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Sent: "bg-blue-100 text-blue-700",
  Paid: "bg-green-100 text-green-700",
  Overdue: "bg-red-100 text-red-700",
  Void: "bg-slate-100 text-slate-500",
}

interface BulkActionsProps {
  invoices: InvoiceRow[]
}

export function BulkActions({ invoices }: BulkActionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [action, setAction] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState("")
  const [result, setResult] = useState<BulkResult | null>(null)
  const [error, setError] = useState("")

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === invoices.length) {
        return new Set()
      }
      return new Set(invoices.map((inv) => inv.id))
    })
  }, [invoices])

  function handleActionSelect(selectedAction: string) {
    if (!selectedAction) return
    setAction(selectedAction)

    if (selectedAction === "export") {
      handleExport()
      return
    }

    setShowConfirm(true)
  }

  function handleExport() {
    const selected = invoices.filter((inv) => selectedIds.has(inv.id))
    const csvHeaders = [
      "Invoice #",
      "Contact",
      "Date",
      "Due Date",
      "Status",
      "Total",
    ]
    const csvRows = selected.map((inv) => [
      inv.invoiceNumber,
      inv.contactName,
      new Date(inv.date).toLocaleDateString("en-AU"),
      new Date(inv.dueDate).toLocaleDateString("en-AU"),
      inv.status,
      inv.total.toFixed(2),
    ])

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `invoices-export-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)

    setAction("")
  }

  async function handleConfirm() {
    setShowConfirm(false)
    setProcessing(true)
    setProgress("Processing...")
    setResult(null)
    setError("")

    try {
      const res = await fetch("/api/invoices/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          invoiceIds: Array.from(selectedIds),
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        setError(errData.error || "Bulk operation failed")
        return
      }

      const data: BulkResult = await res.json()
      setResult(data)
      setProgress("")
      setSelectedIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk operation failed")
    } finally {
      setProcessing(false)
      setAction("")
    }
  }

  const actionLabel: Record<string, string> = {
    "mark-sent": "Mark as Sent",
    "mark-paid": "Mark as Paid",
    export: "Export Selected",
  }

  if (invoices.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-slate-400">
        No invoices yet. Create your first invoice to get started.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">
            {selectedIds.size > 0
              ? `${selectedIds.size} invoice${selectedIds.size > 1 ? "s" : ""} selected`
              : "Select invoices for bulk actions"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value=""
            onChange={(e) => handleActionSelect(e.target.value)}
            disabled={selectedIds.size === 0 || processing}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Bulk Actions...</option>
            <option value="mark-sent">Mark as Sent</option>
            <option value="mark-paid">Mark as Paid</option>
            <option value="export">Export Selected</option>
          </select>
        </div>
      </div>

      {/* Progress Indicator */}
      {processing && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
          <svg
            className="h-5 w-5 animate-spin text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
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
          <span className="text-sm font-medium text-indigo-700">
            {progress}
          </span>
        </div>
      )}

      {/* Result Summary */}
      {result && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex gap-6">
            <span className="text-sm">
              <span className="font-medium text-green-700">
                {result.updated}
              </span>{" "}
              updated
            </span>
            {result.failed > 0 && (
              <span className="text-sm">
                <span className="font-medium text-red-700">
                  {result.failed}
                </span>{" "}
                failed
              </span>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="text-xs text-red-600 space-y-1">
              {result.errors.map((err, i) => (
                <p key={i}>
                  {err.invoiceNumber}: {err.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Invoice Table with Checkboxes */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size === invoices.length && invoices.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className={`transition-colors hover:bg-slate-50 ${
                  selectedIds.has(inv.id) ? "bg-indigo-50/50" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(inv.id)}
                    onChange={() => toggleSelect(inv.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    {inv.invoiceNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {inv.contactName}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {new Date(inv.date).toLocaleDateString("en-AU")}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {new Date(inv.dueDate).toLocaleDateString("en-AU")}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusBadge[inv.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                  $
                  {inv.total.toLocaleString("en-AU", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Confirm Bulk Action
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to{" "}
              <span className="font-medium">{actionLabel[action]}</span> for{" "}
              <span className="font-medium">{selectedIds.size}</span>{" "}
              invoice{selectedIds.size > 1 ? "s" : ""}?
            </p>
            <p className="mt-1 text-xs text-slate-400">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setAction("")
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
