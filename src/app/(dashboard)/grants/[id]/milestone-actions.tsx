"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export function MilestoneToggle({
  milestoneId,
  completed,
}: {
  milestoneId: string
  completed: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCompleted, setIsCompleted] = useState(completed)

  function handleToggle() {
    const newValue = !isCompleted
    setIsCompleted(newValue)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/grants/milestones/${milestoneId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: newValue }),
        })
        if (res.ok) {
          router.refresh()
        } else {
          setIsCompleted(!newValue)
        }
      } catch {
        setIsCompleted(!newValue)
      }
    })
  }

  return (
    <input
      type="checkbox"
      checked={isCompleted}
      onChange={handleToggle}
      disabled={isPending}
      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
    />
  )
}

export function MilestoneForm({ grantId }: { grantId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [spendToDate, setSpendToDate] = useState("")
  const [evidence, setEvidence] = useState("")
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!title) {
      setMessage({ type: "error", text: "Title is required." })
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/grants/milestones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grantId,
            title,
            dueDate: dueDate || null,
            spendToDate: spendToDate ? parseFloat(spendToDate) : null,
            evidence: evidence || null,
          }),
        })

        if (res.ok) {
          setTitle("")
          setDueDate("")
          setSpendToDate("")
          setEvidence("")
          setIsOpen(false)
          router.refresh()
        } else {
          const data = await res.json()
          setMessage({
            type: "error",
            text: data.error || "Failed to add milestone.",
          })
        }
      } catch {
        setMessage({ type: "error", text: "An error occurred." })
      }
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          Add Milestone
        </h2>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border-t border-slate-100 p-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Milestone title"
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Spend to Date (AUD)
              </label>
              <input
                type="number"
                step="0.01"
                value={spendToDate}
                onChange={(e) => setSpendToDate(e.target.value)}
                placeholder="0.00"
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Evidence / Notes
              </label>
              <input
                type="text"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Optional notes"
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {isPending ? "Adding..." : "Add Milestone"}
            </button>
            {message && (
              <span
                className={`text-sm font-medium ${
                  message.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {message.text}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
