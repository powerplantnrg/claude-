"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface Contact {
  id: string
  name: string
}

interface Account {
  id: string
  code: string
  name: string
  type: string
}

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  accountId: string
  taxRateId: string
}

const emptyLine: LineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  accountId: "",
  taxRateId: "GST",
}

export default function NewQuotePage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contactId, setContactId] = useState("")
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0])
  const [expiryDate, setExpiryDate] = useState("")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [terms, setTerms] = useState("")
  const [lines, setLines] = useState<LineItem[]>([{ ...emptyLine }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setContacts(data)
      })
    fetch("/api/accounts?type=Revenue")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAccounts(data)
      })

    // Set default expiry to 30 days from now
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)
    setExpiryDate(expiry.toISOString().split("T")[0])
  }, [])

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
    line.taxRateId === "GST" ? calcLineAmount(line) * 0.1 : 0

  const subtotal = lines.reduce((sum, l) => sum + calcLineAmount(l), 0)
  const gstTotal = lines.reduce((sum, l) => sum + calcLineTax(l), 0)
  const total = subtotal + gstTotal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const errors: Record<string, string> = {}

    if (!contactId) {
      errors.contactId = "Please select a contact."
    }
    if (!issueDate) {
      errors.issueDate = "Issue date is required."
    }
    if (!expiryDate) {
      errors.expiryDate = "Expiry date is required."
    }
    if (lines.length === 0) {
      errors.lines = "At least one line item is required."
    }
    lines.forEach((l, i) => {
      if (!l.description) errors[`line_${i}_desc`] = "Description required"
      if (!l.accountId) errors[`line_${i}_account`] = "Account required"
      if (l.unitPrice <= 0) errors[`line_${i}_price`] = "Must be > 0"
    })

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const msg = errors.contactId || errors.lines || "Please fix the highlighted fields."
      setError(msg)
      toast.error("Validation Error", msg)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          issueDate,
          expiryDate,
          reference,
          notes,
          terms,
          lines: lines.map((l) => ({
            ...l,
            taxRateId: l.taxRateId === "GST" ? l.taxRateId : null,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        const errMsg = data.error || "Failed to create quote."
        setError(errMsg)
        toast.error("Failed to Create Quote", errMsg)
        return
      }

      toast.success("Quote Created", "Your quote has been created successfully.")
      router.push("/quotes")
    } catch {
      setError("An unexpected error occurred.")
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Quote</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a new quote or estimate
          </p>
        </div>
        <Link
          href="/quotes"
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header fields */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contact
              </label>
              <select
                value={contactId}
                onChange={(e) => { setContactId(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.contactId; return n }) }}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${fieldErrors.contactId ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"}`}
              >
                <option value="">Select a contact...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.contactId && <p className="mt-1 text-xs text-red-600">{fieldErrors.contactId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional reference..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => { setIssueDate(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.issueDate; return n }) }}
                className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${fieldErrors.issueDate ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"}`}
              />
              {fieldErrors.issueDate && <p className="mt-1 text-xs text-red-600">{fieldErrors.issueDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => { setExpiryDate(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.expiryDate; return n }) }}
                className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${fieldErrors.expiryDate ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"}`}
              />
              {fieldErrors.expiryDate && <p className="mt-1 text-xs text-red-600">{fieldErrors.expiryDate}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Optional notes for this quote..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Terms & Conditions
              </label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Optional terms and conditions..."
              />
            </div>
          </div>
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
                        value={line.taxRateId}
                        onChange={(e) =>
                          updateLine(i, "taxRateId", e.target.value)
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
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">${fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/quotes"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
            {submitting ? "Creating..." : "Create Quote"}
          </button>
        </div>
      </form>
    </div>
  )
}
