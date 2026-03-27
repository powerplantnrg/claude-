"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface LoanDetail {
  id: string
  name: string
  lender: string | null
  loanType: string
  principalAmount: number
  interestRate: number
  interestType: string
  termMonths: number
  monthlyPayment: number | null
  currentBalance: number | null
  startDate: string
  maturityDate: string
  status: string
  notes: string | null
  liabilityAccount: { id: string; name: string; code: string } | null
  interestExpenseAccount: { id: string; name: string; code: string } | null
  payments: Array<{
    id: string
    date: string
    principalAmount: number
    interestAmount: number
    totalAmount: number
    balance: number
    notes: string | null
  }>
  amortizationSchedule: Array<{
    period: number
    date: string
    payment: number
    principal: number
    interest: number
    balance: number
  }>
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [loan, setLoan] = useState<LoanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"overview" | "amortization" | "payments">("overview")

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split("T")[0],
    principalAmount: "",
    interestAmount: "",
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchLoan = useCallback(async () => {
    try {
      const res = await fetch(`/api/loans/${id}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setLoan(data)
    } catch {
      toast.error("Failed to load loan details")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchLoan()
  }, [fetchLoan])

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/loans/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to record payment")
      }
      toast.success("Payment recorded successfully")
      setShowPaymentForm(false)
      setPaymentForm({ date: new Date().toISOString().split("T")[0], principalAmount: "", interestAmount: "", notes: "" })
      fetchLoan()
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Loan not found</p>
        <Link href="/loans" className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
          Back to Loans
        </Link>
      </div>
    )
  }

  const totalInterestPaid = loan.payments.reduce((s, p) => s + p.interestAmount, 0)
  const totalPrincipalPaid = loan.payments.reduce((s, p) => s + p.principalAmount, 0)
  const progressPct = loan.principalAmount > 0
    ? ((loan.principalAmount - (loan.currentBalance ?? 0)) / loan.principalAmount) * 100
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/loans" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Loans
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{loan.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loan.lender ? `${loan.lender} - ` : ""}{loan.loanType} | {loan.interestRate}% {loan.interestType}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            loan.status === "Active"
              ? "bg-green-100 text-green-700"
              : loan.status === "Paid Off"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {loan.status}
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Current Balance</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">${fmt(loan.currentBalance ?? 0)}</p>
          <div className="mt-2 h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-blue-600"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">{progressPct.toFixed(1)}% repaid</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Monthly Payment</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">${fmt(loan.monthlyPayment ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Principal Paid</p>
          <p className="mt-1 text-2xl font-bold text-green-600">${fmt(totalPrincipalPaid)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Interest Paid</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">${fmt(totalInterestPaid)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {(["overview", "amortization", "payments"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Loan Details</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Principal Amount</dt>
              <dd className="text-sm font-medium text-slate-900">${fmt(loan.principalAmount)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Interest Rate</dt>
              <dd className="text-sm font-medium text-slate-900">{loan.interestRate}% ({loan.interestType})</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Term</dt>
              <dd className="text-sm font-medium text-slate-900">{loan.termMonths} months</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Start Date</dt>
              <dd className="text-sm font-medium text-slate-900">
                {new Date(loan.startDate).toLocaleDateString("en-AU")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Maturity Date</dt>
              <dd className="text-sm font-medium text-slate-900">
                {new Date(loan.maturityDate).toLocaleDateString("en-AU")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Liability Account</dt>
              <dd className="text-sm font-medium text-slate-900">
                {loan.liabilityAccount ? `${loan.liabilityAccount.code} - ${loan.liabilityAccount.name}` : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Interest Expense Account</dt>
              <dd className="text-sm font-medium text-slate-900">
                {loan.interestExpenseAccount ? `${loan.interestExpenseAccount.code} - ${loan.interestExpenseAccount.name}` : "Not set"}
              </dd>
            </div>
            {loan.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-slate-500">Notes</dt>
                <dd className="text-sm text-slate-900">{loan.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {tab === "amortization" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Payment</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Principal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Interest</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loan.amortizationSchedule.map((row) => (
                <tr key={row.period} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm text-slate-600">{row.period}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">
                    {new Date(row.date).toLocaleDateString("en-AU")}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-slate-600">${fmt(row.payment)}</td>
                  <td className="px-4 py-2 text-sm text-right text-slate-600">${fmt(row.principal)}</td>
                  <td className="px-4 py-2 text-sm text-right text-slate-600">${fmt(row.interest)}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium text-slate-900">${fmt(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "payments" && (
        <div className="space-y-4">
          {loan.status === "Active" && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Record Payment
              </button>
            </div>
          )}

          {showPaymentForm && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Record Payment</h3>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Date *</label>
                    <input
                      type="date"
                      required
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Principal Amount *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={paymentForm.principalAmount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, principalAmount: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Interest Amount *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={paymentForm.interestAmount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, interestAmount: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Notes</label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Optional notes"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? "Recording..." : "Record Payment"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Principal</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Interest</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loan.payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                      No payments recorded yet
                    </td>
                  </tr>
                ) : (
                  loan.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {new Date(p.date).toLocaleDateString("en-AU")}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-slate-600">${fmt(p.principalAmount)}</td>
                      <td className="px-4 py-2 text-sm text-right text-slate-600">${fmt(p.interestAmount)}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-slate-900">${fmt(p.totalAmount)}</td>
                      <td className="px-4 py-2 text-sm text-right text-slate-600">${fmt(p.balance)}</td>
                      <td className="px-4 py-2 text-sm text-slate-500">{p.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
