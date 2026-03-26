"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

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
  taxType: string
}

const emptyLine: LineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  accountId: "",
  taxType: "GST",
}

export default function EditInvoicePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contactId, setContactId] = useState("")
  const [date, setDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<LineItem[]>([{ ...emptyLine }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [invoiceNumber, setInvoiceNumber] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts").then((r) => r.json()),
      fetch("/api/accounts?type=Revenue").then((r) => r.json()),
      fetch(`/api/invoices/${id}`).then((r) => r.json()),
    ]).then(([contactsData, accountsData, invoice]) => {
      if (Array.isArray(contactsData)) setContacts(contactsData)
      if (Array.isArray(accountsData)) setAccounts(accountsData)

      if (invoice.error) {
        setError(invoice.error)
        setLoading(false)
        return
      }

      if (invoice.status !== "Draft") {
        setError("Only Draft invoices can be edited.")
        setLoading(false)
        return
      }

      setInvoiceNumber(invoice.invoiceNumber)
      setContactId(invoice.contactId)
      setDate(new Date(invoice.date).toISOString().split("T")[0])
      setDueDate(new Date(invoice.dueDate).toISOString().split("T")[0])
      setNotes(invoice.notes || "")
      setLines(
        invoice.lines.map((l: any) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          accountId: l.accountId,
          taxType: l.taxType || "GST",
        }))
      )
      setLoading(false)
    }).catch(() => {
      setError("Failed to load invoice data.")
      setLoading(false)
    })
  }, [id])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!contactId) {
      setError("Please select a contact.")
      return
    }
    if (!date || !dueDate) {
      setError("Please fill in both date fields.")
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
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, date, dueDate, notes, lines }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to update invoice.")
        return
      }

      router.push(`/invoices/${id}`)
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-sm text-slate-500">
        Loading invoice...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Edit Invoice {invoiceNumber}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Update this draft invoice
          </p>
        </div>
        <Link
          href={`/invoices/${id}`}
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
            <div>{/* spacer */}</div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Invoice Date
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
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
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
                placeholder="Optional notes for this invoice..."
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
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">${fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href={`/invoices/${id}`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
