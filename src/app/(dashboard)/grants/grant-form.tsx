"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export function GrantForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const [provider, setProvider] = useState("")
  const [amount, setAmount] = useState("")
  const [deadline, setDeadline] = useState("")
  const [description, setDescription] = useState("")
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!name || !provider) {
      setMessage({ type: "error", text: "Name and provider are required." })
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/grants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            provider,
            amount: amount ? parseFloat(amount) : null,
            applicationDeadline: deadline || null,
            description: description || null,
          }),
        })

        if (res.ok) {
          setName("")
          setProvider("")
          setAmount("")
          setDeadline("")
          setDescription("")
          setIsOpen(false)
          setMessage({ type: "success", text: "Grant added successfully." })
          router.refresh()
        } else {
          const data = await res.json()
          setMessage({
            type: "error",
            text: data.error || "Failed to add grant.",
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
        <h2 className="text-lg font-semibold text-slate-900">Add Grant</h2>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Grant Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., R&D Tax Incentive"
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Provider
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g., AusIndustry"
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Amount (AUD)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Application Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the grant"
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
              {isPending ? "Adding..." : "Add Grant"}
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
