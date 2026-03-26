"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export function ScenarioActions({
  scenarioId,
  variables,
  baseline,
}: {
  scenarioId: string
  variables: Record<string, number> | null
  baseline: Record<string, number> | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  function handleRunAgain() {
    const params = new URLSearchParams()
    if (baseline) {
      Object.entries(baseline).forEach(([k, v]) => {
        params.set(`b_${k}`, String(v))
      })
    }
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        params.set(`v_${k}`, String(v))
      })
    }
    router.push(`/scenarios?${params.toString()}`)
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/scenarios/${scenarioId}`, {
          method: "DELETE",
        })
        if (res.ok) {
          router.push("/scenarios")
        }
      } catch {
        // silently fail
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRunAgain}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Run Again
      </button>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "Deleting..." : "Confirm Delete"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
