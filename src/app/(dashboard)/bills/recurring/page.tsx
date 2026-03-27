"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "@/lib/toast-store"

interface RecurringBill {
  id: string
  frequency: string
  nextDate: string
  endDate: string | null
  description: string | null
  amount: number
  taxAmount: number | null
  totalAmount: number
  isActive: boolean
  generatedCount: number | null
  lastGeneratedDate: string | null
  notes: string | null
  contact: { id: string; name: string } | null
  account: { id: string; name: string; code: string } | null
}

interface Contact {
  id: string
  name: string
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function RecurringBillsPage() {
  const [bills, setBills] = useState<RecurringBill[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    contactId: "",
    frequency: "Monthly",
    nextDate: "",
    endDate: "",
    description: "",
    amount: "",
    taxAmount: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [billsRes, contactsRes] = await Promise.all([
        fetch("/api/recurring-bills"),
        fetch("/api/contacts"),
      ])
      if (billsRes.ok) {
        setBills(await billsRes.json())
      }
      if (contactsRes.ok) {
        const contactData = await contactsRes.json()
        setContacts(Array.isArray(contactData) ? contactData : [])
      }
    } catch {
      toast.error("Failed to load recurring bills")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/recurring-bills/generate", { method: "POST" })
      if (!res.ok) throw new Error("Failed to generate")
      const data = await res.json()
      toast.success(data.message)
      fetchData()
    } catch {
      toast.error("Failed to generate bills")
    } finally {
      setGenerating(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/recurring-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          endDate: form.endDate || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create")
      }
      toast.success("Recurring bill created")
      setShowForm(false)
      setForm({ contactId: "", frequency: "Monthly", nextDate: "", endDate: "", description: "", amount: "", taxAmount: "", notes: "" })
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to create recurring bill")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/recurring-bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success(isActive ? "Recurring bill paused" : "Recurring bill activated")
      fetchData()
    } catch {
      toast.error("Failed to update recurring bill")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this recurring bill?")) return
    try {
      const res = await fetch(`/api/recurring-bills/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Recurring bill deleted")
      fetchData()
    } catch {
      toast.error("Failed to delete recurring bill")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recurring Bills</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage recurring bill schedules and auto-generate bills
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Due Bills"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Recurring Bill
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">New Recurring Bill</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Contact *</label>
                <select
                  required
                  value={form.contactId}
                  onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Frequency *</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option>Weekly</option>
                  <option>Fortnightly</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Annually</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Next Due Date *</label>
                <input
                  type="date"
                  required
                  value={form.nextDate}
                  onChange={(e) => setForm({ ...form, nextDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tax Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.taxAmount}
                  onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Bill description"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Recurring Bill"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bills Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Frequency</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Next Due</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Generated</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bills.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                  No recurring bills set up yet
                </td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {bill.contact?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{bill.description || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{bill.frequency}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                    ${fmt(bill.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(bill.nextDate).toLocaleDateString("en-AU")}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-slate-600">
                    {bill.generatedCount ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        bill.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {bill.isActive ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(bill.id, bill.isActive)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        {bill.isActive ? "Pause" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(bill.id)}
                        className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
