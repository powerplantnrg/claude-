"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "@/lib/toast-store"

interface Props {
  quoteId: string
  status: string
}

export function QuoteStatusActions({ quoteId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showConvertConfirm, setShowConvertConfirm] = useState(false)
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false)

  const performAction = async (action: string, extra?: Record<string, string>) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })

      if (!res.ok) {
        const data = await res.json()
        const errMsg = data.error || "Failed to update quote."
        setError(errMsg)
        toast.error("Action Failed", errMsg)
        return
      }

      const actionLabels: Record<string, string> = {
        send: "sent",
        accept: "accepted",
        decline: "declined",
        convert: "converted to invoice",
      }

      toast.success("Quote Updated", `Quote has been ${actionLabels[action] || "updated"}.`)
      router.refresh()
    } catch {
      setError("An unexpected error occurred.")
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  // No actions for terminal states
  if (status === "Declined" || status === "Expired" || status === "Converted") {
    return null
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Actions</h3>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {status === "Draft" && (
            <button
              onClick={() => performAction("send")}
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
              Send Quote
            </button>
          )}

          {status === "Sent" && (
            <>
              <button
                onClick={() => performAction("accept")}
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
                Accept Quote
              </button>
              <button
                onClick={() => setShowDeclineConfirm(true)}
                disabled={loading}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Decline Quote
              </button>
            </>
          )}

          {status === "Accepted" && (
            <button
              onClick={() => setShowConvertConfirm(true)}
              disabled={loading}
              className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Convert to Invoice
            </button>
          )}
        </div>

        {status === "Draft" && (
          <p className="mt-3 text-xs text-slate-500">
            Send this quote to the client for review. They can then accept or decline.
          </p>
        )}
        {status === "Accepted" && (
          <p className="mt-3 text-xs text-slate-500">
            Converting to an invoice will create a new Draft invoice with the same line items.
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConvertConfirm}
        onConfirm={() => {
          setShowConvertConfirm(false)
          performAction("convert")
        }}
        onCancel={() => setShowConvertConfirm(false)}
        title="Convert to Invoice"
        message="This will create a new Draft invoice from this quote. The quote status will be changed to Converted."
        confirmLabel="Convert to Invoice"
        variant="default"
      />

      <ConfirmDialog
        isOpen={showDeclineConfirm}
        onConfirm={() => {
          setShowDeclineConfirm(false)
          performAction("decline")
        }}
        onCancel={() => setShowDeclineConfirm(false)}
        title="Decline Quote"
        message="Are you sure you want to decline this quote? This action cannot be undone."
        confirmLabel="Decline Quote"
        variant="destructive"
      />
    </>
  )
}
