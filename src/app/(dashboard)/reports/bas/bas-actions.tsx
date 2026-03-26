"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface BASActionsProps {
  period: string
  fy: string
  isLodged: boolean
}

export function BASActions({ period, fy, isLodged }: BASActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSaveDraft() {
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch("/api/reports/bas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, fy, action: "save" }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setMessage("BAS draft saved successfully.")
      router.refresh()
    } catch {
      setMessage("Error saving BAS draft.")
    } finally {
      setLoading(false)
    }
  }

  async function handleLodge() {
    if (!confirm("Are you sure you want to mark this BAS as lodged? This records the submission date.")) {
      return
    }
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch("/api/reports/bas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, fy, action: "lodge" }),
      })
      if (!res.ok) throw new Error("Failed to lodge")
      setMessage("BAS marked as lodged.")
      router.refresh()
    } catch {
      setMessage("Error lodging BAS.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleSaveDraft}
        disabled={loading || isLodged}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save Draft
      </button>
      <button
        onClick={handleLodge}
        disabled={loading || isLodged}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLodged ? "Already Lodged" : "Mark as Lodged"}
      </button>
      {message && (
        <span className="text-sm text-slate-600">{message}</span>
      )}
    </div>
  )
}
