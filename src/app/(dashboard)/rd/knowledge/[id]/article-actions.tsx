"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function KnowledgeArticleActions({
  articleId,
}: {
  articleId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  function handleDelete() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/rd/knowledge/${articleId}`, {
          method: "DELETE",
        })
        if (res.ok) {
          router.push("/rd/knowledge")
        }
      } catch {
        // silently fail
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/rd/knowledge/${articleId}/edit`}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Edit
      </Link>
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
