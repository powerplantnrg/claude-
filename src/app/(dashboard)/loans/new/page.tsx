"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface AmortizationRow {
  period: number
  payment: number
  principal: number
  interest: number
  balance: number
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function calculateAmortization(
  principal: number,
  annualRate: number,
  termMonths: number
): { monthlyPayment: number; schedule: AmortizationRow[] } {
  const monthlyRate = annualRate / 100 / 12
  let monthlyPayment: number

  if (annualRate > 0) {
    monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1)
  } else {
    monthlyPayment = principal / termMonths
  }

  const schedule: AmortizationRow[] = []
  let balance = principal

  for (let i = 1; i <= termMonths; i++) {
    const interest = balance * monthlyRate
    const principalPaid = monthlyPayment - interest
    balance = Math.max(0, balance - principalPaid)

    schedule.push({
      period: i,
      payment: Math.round(monthlyPayment * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    })
  }

  return { monthlyPayment: Math.round(monthlyPayment * 100) / 100, schedule }
}

export default function NewLoanPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: "",
    lender: "",
    loanType: "Term Loan",
    principalAmount: "",
    interestRate: "",
    interestType: "Fixed",
    termMonths: "",
    startDate: new Date().toISOString().split("T")[0],
    maturityDate: "",
    notes: "",
  })

  const [preview, setPreview] = useState<{
    monthlyPayment: number
    schedule: AmortizationRow[]
  } | null>(null)

  function updateField(field: string, value: string) {
    const next = { ...form, [field]: value }
    setForm(next)

    // Auto-calculate preview
    const principal = parseFloat(next.principalAmount)
    const rate = parseFloat(next.interestRate)
    const months = parseInt(next.termMonths)

    if (principal > 0 && rate >= 0 && months > 0) {
      setPreview(calculateAmortization(principal, rate, months))
    } else {
      setPreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create loan")
      }
      const loan = await res.json()
      toast.success("Loan created successfully")
      router.push(`/loans/${loan.id}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to create loan")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/loans"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Loans
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Loan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a new loan and preview the amortization schedule
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Loan Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., Equipment Finance"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Lender</label>
                <input
                  type="text"
                  value={form.lender}
                  onChange={(e) => updateField("lender", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., ANZ Bank"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Loan Type</label>
                <select
                  value={form.loanType}
                  onChange={(e) => updateField("loanType", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option>Term Loan</option>
                  <option>Line of Credit</option>
                  <option>Equipment Finance</option>
                  <option>Mortgage</option>
                  <option>Business Loan</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Principal Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.principalAmount}
                  onChange={(e) => updateField("principalAmount", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Interest Rate (%) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.interestRate}
                  onChange={(e) => updateField("interestRate", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="5.50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Term (Months) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.termMonths}
                  onChange={(e) => updateField("termMonths", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Interest Type</label>
                <select
                  value={form.interestType}
                  onChange={(e) => updateField("interestType", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option>Fixed</option>
                  <option>Variable</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Start Date *</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Maturity Date</label>
                <input
                  type="date"
                  value={form.maturityDate}
                  onChange={(e) => updateField("maturityDate", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Loan"}
              </button>
              <Link
                href="/loans"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Amortization Preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Amortization Preview</h2>
          {preview ? (
            <>
              <div className="mt-4 rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-600">Estimated Monthly Payment</p>
                <p className="text-2xl font-bold text-blue-900">${fmt(preview.monthlyPayment)}</p>
                <p className="mt-1 text-xs text-blue-500">
                  Total Interest: ${fmt(preview.schedule.reduce((s, r) => s + r.interest, 0))}
                </p>
              </div>
              <div className="mt-4 max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">#</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Payment</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Principal</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Interest</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.schedule.map((row) => (
                      <tr key={row.period} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-600">{row.period}</td>
                        <td className="px-3 py-1.5 text-right text-slate-600">${fmt(row.payment)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-600">${fmt(row.principal)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-600">${fmt(row.interest)}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-slate-900">${fmt(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              Enter principal, interest rate, and term to see the amortization preview.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
