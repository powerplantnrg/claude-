"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

interface POActionsProps {
  poId: string
  status: string
  poData: {
    contactId: string
    lines: Array<{
      description: string
      quantity: number
      unitPrice: number
      accountId: string
      taxType: string
      amount: number
      taxAmount: number
    }>
    notes: string | null
  }
}

export function POActions({ poId, status, poData }: POActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleTransition(newStatus: string) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/purchase-orders/${poId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || "Failed to update status")
          return
        }
        router.refresh()
      } catch {
        setError("An error occurred")
      }
    })
  }

  function handleConvertToBill() {
    const params = new URLSearchParams({
      fromPO: poId,
      contactId: poData.contactId,
      lines: JSON.stringify(poData.lines),
      notes: poData.notes || "",
    })
    router.push(`/bills/new?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status === "Draft" && (
        <button
          onClick={() => handleTransition("Sent")}
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Updating..." : "Mark Sent"}
        </button>
      )}
      {status === "Sent" && (
        <button
          onClick={() => handleTransition("Received")}
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? "Updating..." : "Mark Received"}
        </button>
      )}
      {status === "Received" && (
        <button
          onClick={handleConvertToBill}
          disabled={isPending}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Convert to Bill
        </button>
      )}
      {status !== "Cancelled" && status !== "Billed" && (
        <button
          onClick={() => handleTransition("Cancelled")}
          disabled={isPending}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {isPending ? "Cancelling..." : "Cancel"}
        </button>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}
