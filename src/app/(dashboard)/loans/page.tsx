"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface Loan {
  id: string
  name: string
  lender: string | null
  loanType: string
  principalAmount: number
  interestRate: number
  termMonths: number
  monthlyPayment: number | null
  currentBalance: number | null
  startDate: string
  maturityDate: string
  status: string
  liabilityAccount: { name: string } | null
}

interface Summary {
  totalDebt: number
  monthlyPayments: number
  nextPaymentDue: string | null
  loanCount: number
  activeCount: number
}

const statusBadge: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  "Paid Off": "bg-blue-100 text-blue-700",
  Defaulted: "bg-red-100 text-red-700",
  Restructured: "bg-amber-100 text-amber-700",
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLoans = useCallback(async () => {
    try {
      const res = await fetch("/api/loans")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setLoans(data.loans)
      setSummary(data.summary)
    } catch {
      toast.error("Failed to load loans")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

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
          <h1 className="text-2xl font-bold text-slate-900">Loans</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track and manage loan balances, payments, and amortization
          </p>
        </div>
        <Link
          href="/loans/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Loan
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Debt</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">${fmt(summary.totalDebt)}</p>
            <p className="mt-1 text-xs text-slate-400">{summary.activeCount} active loans</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Monthly Payments</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">${fmt(summary.monthlyPayments)}</p>
            <p className="mt-1 text-xs text-slate-400">Combined monthly obligation</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Loans</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.loanCount}</p>
            <p className="mt-1 text-xs text-slate-400">All time</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Next Payment Due</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {summary.nextPaymentDue
                ? new Date(summary.nextPaymentDue).toLocaleDateString("en-AU", { month: "short", day: "numeric" })
                : "N/A"}
            </p>
            <p className="mt-1 text-xs text-slate-400">Upcoming payment date</p>
          </div>
        </div>
      )}

      {/* Loan Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Lender</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Type</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Principal</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Balance</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Rate</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Monthly</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Maturity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loans.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                  No loans found. Create your first loan to get started.
                </td>
              </tr>
            ) : (
              loans.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/loans/${loan.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      {loan.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{loan.lender || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{loan.loanType}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">${fmt(loan.principalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                    ${fmt(loan.currentBalance ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">{loan.interestRate}%</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">
                    ${fmt(loan.monthlyPayment ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(loan.maturityDate).toLocaleDateString("en-AU")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusBadge[loan.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {loan.status}
                    </span>
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
