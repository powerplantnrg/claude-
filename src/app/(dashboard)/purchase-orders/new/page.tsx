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
  taxType: string
}

const emptyLine: LineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  accountId: "",
  taxType: "GST",
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contactId, setContactId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [deliveryDate, setDeliveryDate] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<LineItem[]>([{ ...emptyLine }])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {})
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
  const removeLine = (index: number) =>
    setLines((prev) => prev.filter((_, i) => i !== index))

  const computeLineAmount = (line: LineItem) => line.quantity * line.unitPrice
  const computeTax = (line: LineItem) => {
    const amount = computeLineAmount(line)
    return line.taxType === "GST" ? amount * 0.1 : 0
  }

  const subtotal = lines.reduce((sum, l) => sum + computeLineAmount(l), 0)
  const taxTotal = lines.reduce((sum, l) => sum + computeTax(l), 0)
  const total = subtotal + taxTotal

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contactId) {
      toast.error("Please select a supplier")
      return
    }
    if (lines.every((l) => !l.description)) {
      toast.error("Add at least one line item")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          date,
          deliveryDate: deliveryDate || null,
          notes: notes || null,
          lines: lines
            .filter((l) => l.description)
            .map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              accountId: l.accountId,
              taxType: l.taxType,
              amount: computeLineAmount(l),
              taxAmount: computeTax(l),
            })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create purchase order")
      }
      toast.success("Purchase order created")
      router.push("/purchase-orders")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create purchase order")
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Purchase Order</h1>
          <p className="mt-1 text-sm text-slate-500">Create a purchase order for a supplier</p>
        </div>
        <Link
          href="/purchase-orders"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Supplier</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Select supplier...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Delivery Date</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Line Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Description</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 w-24">Qty</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 w-32">Unit Price</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 w-40">Account</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 w-28">Tax</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600 w-28">Amount</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(i, "description", e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="Description"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        min="0"
                        step="any"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={line.accountId}
                        onChange={(e) => updateLine(i, "accountId", e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">Select...</option>
                        {accounts
                          .filter((a) => a.type === "Expense" || a.type === "Asset")
                          .map((a) => (
                            <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                          ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={line.taxType}
                        onChange={(e) => updateLine(i, "taxType", e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="GST">GST 10%</option>
                        <option value="GST Free">GST Free</option>
                        <option value="BAS Excluded">Excluded</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-800">
                      {fmt(computeLineAmount(line))}
                    </td>
                    <td className="px-4 py-2">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
            <button
              type="button"
              onClick={addLine}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Line
            </button>
            <div className="text-sm space-y-1 text-right">
              <div className="text-slate-500">Subtotal: {fmt(subtotal)}</div>
              <div className="text-slate-500">Tax: {fmt(taxTotal)}</div>
              <div className="text-lg font-bold text-slate-900">Total: {fmt(total)}</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Optional notes..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/purchase-orders"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Purchase Order"}
          </button>
        </div>
      </form>
    </div>
  )
}
