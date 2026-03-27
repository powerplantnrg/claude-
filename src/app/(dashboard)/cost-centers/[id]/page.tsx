"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface CostCenterDetail {
  id: string
  code: string
  name: string
  description: string | null
  type: string
  isActive: boolean
  parent: { id: string; name: string; code: string } | null
  children: Array<{ id: string; name: string; code: string; isActive: boolean }>
  allocations: Array<{
    id: string
    percentage: number | null
    amount: number | null
    journalLine: {
      account: { name: string; code: string }
      journalEntry: { date: string; description: string }
    } | null
  }>
  summary: {
    totalSpending: number
    allocationCount: number
    spendingByAccount: Array<{ name: string; code: string; total: number }>
  }
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CostCenterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [costCenter, setCostCenter] = useState<CostCenterDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"spending" | "allocations">("spending")

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/cost-centers/${id}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setCostCenter(data)
    } catch {
      toast.error("Failed to load cost center details")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!costCenter) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Cost center not found</p>
        <Link href="/cost-centers" className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
          Back to Cost Centers
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cost-centers" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Cost Centers
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {costCenter.code} - {costCenter.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {costCenter.type}
            {costCenter.parent && ` | Parent: ${costCenter.parent.code} - ${costCenter.parent.name}`}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            costCenter.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
          }`}
        >
          {costCenter.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Spending</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">${fmt(costCenter.summary.totalSpending)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Allocations</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{costCenter.summary.allocationCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Sub-Centers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{costCenter.children.length}</p>
        </div>
      </div>

      {/* Children */}
      {costCenter.children.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Sub-Centers</h2>
          <div className="flex flex-wrap gap-2">
            {costCenter.children.map((child) => (
              <Link
                key={child.id}
                href={`/cost-centers/${child.id}`}
                className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-blue-600">{child.code}</span>
                <span className="ml-2 text-slate-600">{child.name}</span>
                {!child.isActive && (
                  <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">Inactive</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {(["spending", "allocations"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "spending" ? "Spending Breakdown" : "Allocation History"}
            </button>
          ))}
        </nav>
      </div>

      {tab === "spending" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Account</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costCenter.summary.spendingByAccount.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-sm text-slate-400">
                    No spending data available
                  </td>
                </tr>
              ) : (
                costCenter.summary.spendingByAccount.map((item) => (
                  <tr key={item.code} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.code}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                      ${fmt(item.total)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      {costCenter.summary.totalSpending > 0
                        ? ((item.total / costCenter.summary.totalSpending) * 100).toFixed(1)
                        : 0}
                      %
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "allocations" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Account</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costCenter.allocations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                    No allocations recorded
                  </td>
                </tr>
              ) : (
                costCenter.allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {alloc.journalLine?.journalEntry?.date
                        ? new Date(alloc.journalLine.journalEntry.date).toLocaleDateString("en-AU")
                        : "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {alloc.journalLine?.journalEntry?.description || "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {alloc.journalLine?.account
                        ? `${alloc.journalLine.account.code} - ${alloc.journalLine.account.name}`
                        : "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-slate-900">
                      ${fmt(alloc.amount ?? 0)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-slate-600">
                      {alloc.percentage != null ? `${alloc.percentage}%` : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
