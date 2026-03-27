"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "@/lib/toast-store"

interface Dividend {
  id: string
  declarationDate: string
  recordDate: string | null
  paymentDate: string | null
  amountPerShare: number | null
  totalAmount: number
  frankingPercentage: number
  frankingCredits: number
  status: string
  notes: string | null
}

interface Summary {
  totalDividends: number
  totalFrankingCredits: number
  declaredCount: number
  paidCount: number
}

const statusBadge: Record<string, string> = {
  Declared: "bg-blue-100 text-blue-700",
  Paid: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function DividendsPage() {
  const [dividends, setDividends] = useState<Dividend[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    declarationDate: new Date().toISOString().split("T")[0],
    recordDate: "",
    paymentDate: "",
    amountPerShare: "",
    totalAmount: "",
    frankingPercentage: "100",
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  const fetchDividends = useCallback(async () => {
    try {
      const res = await fetch("/api/dividends")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setDividends(data.dividends)
      setSummary(data.summary)
    } catch {
      toast.error("Failed to load dividends")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDividends()
  }, [fetchDividends])

  async function handleDeclare(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/dividends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to declare dividend")
      }
      toast.success("Dividend declared successfully")
      setShowForm(false)
      setForm({
        declarationDate: new Date().toISOString().split("T")[0],
        recordDate: "",
        paymentDate: "",
        amountPerShare: "",
        totalAmount: "",
        frankingPercentage: "100",
        notes: "",
      })
      fetchDividends()
    } catch (err: any) {
      toast.error(err.message || "Failed to declare dividend")
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const res = await fetch(`/api/dividends/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update")
      }
      toast.success(`Dividend ${status.toLowerCase()} successfully`)
      fetchDividends()
    } catch (err: any) {
      toast.error(err.message || "Failed to update dividend")
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
          <h1 className="text-2xl font-bold text-slate-900">Dividends</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage dividend declarations, payments, and franking credits
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Declare Dividend
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Dividends</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">${fmt(summary.totalDividends)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Franking Credits</p>
            <p className="mt-1 text-2xl font-bold text-green-600">${fmt(summary.totalFrankingCredits)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Declared</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{summary.declaredCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Paid</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.paidCount}</p>
          </div>
        </div>
      )}

      {/* Declare Form */}
      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Declare New Dividend</h3>
          <form onSubmit={handleDeclare} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Declaration Date *</label>
                <input
                  type="date"
                  required
                  value={form.declarationDate}
                  onChange={(e) => setForm({ ...form, declarationDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Record Date</label>
                <input
                  type="date"
                  value={form.recordDate}
                  onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Payment Date</label>
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Total Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.totalAmount}
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Amount Per Share</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amountPerShare}
                  onChange={(e) => setForm({ ...form, amountPerShare: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Franking % </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.frankingPercentage}
                  onChange={(e) => setForm({ ...form, frankingPercentage: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Optional notes"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Declaring..." : "Declare Dividend"}
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

      {/* Dividend Register Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Declaration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Record Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Payment Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Per Share</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Franking %</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Franking Credits</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dividends.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                  No dividends declared yet
                </td>
              </tr>
            ) : (
              dividends.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(d.declarationDate).toLocaleDateString("en-AU")}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {d.recordDate ? new Date(d.recordDate).toLocaleDateString("en-AU") : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {d.paymentDate ? new Date(d.paymentDate).toLocaleDateString("en-AU") : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">
                    {d.amountPerShare != null ? `$${fmt(d.amountPerShare)}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                    ${fmt(d.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">
                    {d.frankingPercentage}%
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                    ${fmt(d.frankingCredits)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusBadge[d.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {d.status === "Declared" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(d.id, "Paid")}
                            className="rounded border border-green-300 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => handleStatusChange(d.id, "Cancelled")}
                            className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            Cancel
                          </button>
                        </>
                      )}
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
