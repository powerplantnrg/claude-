"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Contact {
  id: string
  name: string
}

interface Account {
  id: string
  code: string
  name: string
}

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  accountId: string
  taxType: string
}

const emptyLine: LineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  accountId: "",
  taxType: "GST",
}

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
]

interface RecurringFormProps {
  contacts: Contact[]
  accounts: Account[]
}

export function RecurringForm({ contacts, accounts }: RecurringFormProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [contactId, setContactId] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [nextDate, setNextDate] = useState(new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = useState("")
  const [dayOfMonth, setDayOfMonth] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<LineItem[]>([{ ...emptyLine }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const updateLine = useCallback(
    (index: number, field: keyof LineItem, value: string | number) => {
      setLines((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }
        return updated
      })
    },
    []
  )

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }])

  const removeLine = (index: number) => {
    if (lines.length === 1) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const calcLineAmount = (line: LineItem) => line.quantity * line.unitPrice
  const calcLineTax = (line: LineItem) =>
    line.taxType === "GST" ? calcLineAmount(line) * 0.1 : 0

  const subtotal = lines.reduce((sum, l) => sum + calcLineAmount(l), 0)
  const gstTotal = lines.reduce((sum, l) => sum + calcLineTax(l), 0)
  const total = subtotal + gstTotal

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  // Calculate next invoice date preview
  function getNextDatePreview(): string {
    if (!nextDate) return ""
    const d = new Date(nextDate)
    const label: Record<string, string> = {
      weekly: "every week",
      fortnightly: "every 2 weeks",
      monthly: "every month",
      quarterly: "every 3 months",
      annually: "every year",
    }
    return `Starting ${d.toLocaleDateString("en-AU")}, repeating ${label[frequency] || frequency}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!contactId) {
      setError("Please select a contact.")
      return
    }
    if (!nextDate) {
      setError("Please set a start date.")
      return
    }
    if (lines.some((l) => !l.description || !l.accountId || l.unitPrice <= 0)) {
      setError(
        "Each line item needs a description, account, and a unit price greater than zero."
      )
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/invoices/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          frequency,
          nextDate,
          endDate: endDate || null,
          dayOfMonth: dayOfMonth ? parseInt(dayOfMonth) : null,
          templateData: JSON.stringify({ lines, notes }),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create recurring invoice.")
        return
      }

      // Reset
      setContactId("")
      setFrequency("monthly")
      setNextDate(new Date().toISOString().split("T")[0])
      setEndDate("")
      setDayOfMonth("")
      setNotes("")
      setLines([{ ...emptyLine }])
      setShowForm(false)
      router.refresh()
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Recurring Invoice
      </button>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header fields */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            New Recurring Invoice
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contact
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select a contact...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                End Date <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {(frequency === "monthly" || frequency === "quarterly") && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Day of Month <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Optional notes for generated invoices..."
              />
            </div>
          </div>

          {/* Schedule preview */}
          {nextDate && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {getNextDatePreview()}
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Line Items
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-44">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">
                    Tax
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">
                    Amount
                  </th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) =>
                          updateLine(i, "description", e.target.value)
                        }
                        placeholder="Item description"
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(i, "quantity", parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice || ""}
                        onChange={(e) =>
                          updateLine(
                            i,
                            "unitPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0.00"
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={line.accountId}
                        onChange={(e) =>
                          updateLine(i, "accountId", e.target.value)
                        }
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={line.taxType}
                        onChange={(e) =>
                          updateLine(i, "taxType", e.target.value)
                        }
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="GST">GST (10%)</option>
                        <option value="GST Free">GST Free</option>
                        <option value="BAS Excluded">BAS Excluded</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium text-slate-900">
                      ${fmt(calcLineAmount(line))}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={lines.length === 1}
                        className="rounded p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
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
              onClick={addLine}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg
                className="mr-1.5 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Line Item
            </button>
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="ml-auto max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium text-slate-900">${fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">GST (10%)</span>
              <span className="font-medium text-slate-900">${fmt(gstTotal)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-base">
              <span className="font-semibold text-slate-900">Total per invoice</span>
              <span className="font-bold text-slate-900">${fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setShowForm(false)
              setError("")
            }}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Creating..." : "Create Recurring Invoice"}
          </button>
        </div>
      </form>
    </div>
  )
}
