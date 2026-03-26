"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface RdProject {
  id: string
  name: string
}

interface ExpenseItem {
  date: string
  description: string
  category: string
  amount: string
  taxAmount: string
  receiptPath: string
  rdProjectId: string
}

const categories = [
  { value: "travel", label: "Travel" },
  { value: "meals", label: "Meals" },
  { value: "supplies", label: "Supplies" },
  { value: "software", label: "Software" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
]

const emptyItem: ExpenseItem = {
  date: new Date().toISOString().split("T")[0],
  description: "",
  category: "other",
  amount: "",
  taxAmount: "",
  receiptPath: "",
  rdProjectId: "",
}

export default function NewExpenseClaimPage() {
  const router = useRouter()
  const [rdProjects, setRdProjects] = useState<RdProject[]>([])
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<ExpenseItem[]>([{ ...emptyItem }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/rd/projects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRdProjects(data.map((p: any) => ({ id: p.id, name: p.name })))
        }
      })
      .catch(() => {})
  }, [])

  const updateItem = useCallback(
    (index: number, field: keyof ExpenseItem, value: string) => {
      setItems((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }

        // Auto-calculate 10% GST when amount changes
        if (field === "amount") {
          const amt = parseFloat(value) || 0
          updated[index].taxAmount = (amt * 0.1).toFixed(2)
        }

        return updated
      })
    },
    []
  )

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }])

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const runningTotal = items.reduce((sum, item) => {
    const amt = parseFloat(item.amount) || 0
    const tax = parseFloat(item.taxAmount) || 0
    return sum + amt + tax
  }, 0)

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const handleSubmit = async (e: React.FormEvent, status: string) => {
    e.preventDefault()
    setError("")

    if (items.some((item) => !item.description || !item.amount)) {
      setError("Each item needs a description and amount.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          notes: notes || null,
          status,
          items: items.map((item) => ({
            date: item.date,
            description: item.description,
            category: item.category,
            amount: parseFloat(item.amount) || 0,
            taxAmount: parseFloat(item.taxAmount) || 0,
            receiptPath: item.receiptPath || null,
            rdProjectId: item.rdProjectId || null,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create expense claim.")
        return
      }

      router.push("/expenses")
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUploadReceipt = async (index: number) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*,.pdf"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append("file", file)

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        if (res.ok) {
          const data = await res.json()
          updateItem(index, "receiptPath", data.path || data.filePath || file.name)
        }
      } catch {
        // If upload fails, just store the filename
        updateItem(index, "receiptPath", file.name)
      }
    }
    input.click()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Expense Claim</h1>
          <p className="mt-1 text-sm text-slate-500">
            Submit expenses for reimbursement
          </p>
        </div>
        <Link
          href="/expenses"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form className="space-y-6">
        {/* Claim header */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Claim Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional claim description..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Expense items */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Expense Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">
                    GST
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">
                    Receipt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-36">
                    R&D Project
                  </th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateItem(i, "date", e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(i, "description", e.target.value)}
                        placeholder="Expense description"
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(i, "category", e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {categories.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateItem(i, "amount", e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.taxAmount}
                        onChange={(e) => updateItem(i, "taxAmount", e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      {item.receiptPath ? (
                        <span className="text-xs text-green-600 font-medium truncate block max-w-[100px]" title={item.receiptPath}>
                          Attached
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUploadReceipt(i)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Upload
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={item.rdProjectId}
                        onChange={(e) => updateItem(i, "rdProjectId", e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">None</option>
                        {rdProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        disabled={items.length === 1}
                        className="rounded p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-6 py-3">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>
        </div>

        {/* Running total */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="ml-auto max-w-xs">
            <div className="flex justify-between text-base">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">${fmt(runningTotal)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/expenses"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => handleSubmit(e, "Draft")}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => handleSubmit(e, "Submitted")}
            className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  )
}
