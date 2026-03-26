"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "@/lib/toast-store"

interface ExpenseClaimActionsProps {
  claimId: string
  status: string
}

export function ExpenseClaimActions({ claimId, status }: ExpenseClaimActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)

  const handleAction = async (action: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/expenses/${claimId}/${action}`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error("Action Failed", data.error || `Failed to ${action} claim.`)
        return
      }

      const labels: Record<string, string> = {
        submit: "submitted for approval",
        approve: "approved",
        reject: "rejected",
        pay: "marked as paid",
      }
      toast.success("Expense Claim Updated", `Claim has been ${labels[action] || action}.`)
      router.refresh()
    } catch {
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const handleRejectClick = () => {
    setShowRejectConfirm(true)
  }

  const handleRejectConfirm = () => {
    setShowRejectConfirm(false)
    handleAction("reject")
  }

  if (status === "Paid" || status === "Rejected") {
    return null
  }

  return (
    <>
      <div className="flex gap-2">
        {status === "Draft" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction("submit")}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Submit for Approval
          </button>
        )}
        {status === "Submitted" && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleAction("approve")}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleRejectClick}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
        {status === "Approved" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction("pay")}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Mark as Paid
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={showRejectConfirm}
        onConfirm={handleRejectConfirm}
        onCancel={() => setShowRejectConfirm(false)}
        title="Reject Expense Claim"
        message="Are you sure you want to reject this expense claim? The submitter will be notified."
        confirmLabel="Reject Claim"
        variant="destructive"
      />
    </>
  )
}
