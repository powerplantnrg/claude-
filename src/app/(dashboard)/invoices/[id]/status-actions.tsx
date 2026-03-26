"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  invoiceId: string
  status: string
}

export function InvoiceStatusActions({ invoiceId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to update status.")
        return
      }

      router.refresh()
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  if (status === "Paid" || status === "Void") return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Actions</h3>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {status === "Draft" && (
          <>
            <button
              onClick={() => updateStatus("Sent")}
              disabled={loading}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Mark as Sent
            </button>
            <button
              onClick={() => updateStatus("Void")}
              disabled={loading}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Void Invoice
            </button>
          </>
        )}

        {(status === "Sent" || status === "Overdue") && (
          <>
            <button
              onClick={() => updateStatus("Paid")}
              disabled={loading}
              className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Record Payment
            </button>
            <button
              onClick={() => updateStatus("Void")}
              disabled={loading}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Void Invoice
            </button>
          </>
        )}
      </div>

      {status === "Draft" && (
        <p className="mt-3 text-xs text-slate-500">
          Marking as Sent will automatically create journal entries (debit
          Accounts Receivable, credit Revenue, credit GST Collected).
        </p>
      )}
    </div>
  )
}
