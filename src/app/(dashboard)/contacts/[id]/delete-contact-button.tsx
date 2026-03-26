"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "@/lib/toast-store"

interface DeleteContactButtonProps {
  contactId: string
  contactName: string
}

export function DeleteContactButton({ contactId, contactName }: DeleteContactButtonProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setShowConfirm(false)
    setLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error("Delete Failed", data.error || "Failed to delete contact.")
        return
      }

      toast.success("Contact Deleted", `${contactName} has been deleted.`)
      router.push("/contacts")
    } catch {
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        title="Delete Contact"
        message={`Are you sure you want to delete "${contactName}"? This action cannot be undone. Any associated invoices and bills will not be deleted.`}
        confirmLabel="Delete Contact"
        variant="destructive"
      />
    </>
  )
}
