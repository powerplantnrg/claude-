"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface BankFeed {
  id: string
  bankName: string
  accountNumber: string
  accountName: string
  status: string
  lastSyncAt: string | null
  feedType: string
  connectionRef: string | null
  _count: { transactions: number }
  transactions: BankFeedTransaction[]
}

interface BankFeedTransaction {
  id: string
  bankFeedId: string
  externalId: string
  date: string
  amount: number
  description: string
  reference: string
  category: string
  status: string
  matchedTransactionId: string | null
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Matched: "bg-green-100 text-green-700",
  Created: "bg-blue-100 text-blue-700",
  Ignored: "bg-slate-100 text-slate-500",
}

export default function BankFeedDetailPage() {
  const params = useParams()
  const feedId = params.id as string

  const [feed, setFeed] = useState<BankFeed | null>(null)
  const [transactions, setTransactions] = useState<BankFeedTransaction[]>([])
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`/api/bank-feeds/${feedId}`)
      if (res.ok) {
        const data = await res.json()
        setFeed(data)
      }
    } catch {
      // handle silently
    } finally {
      setLoading(false)
    }
  }, [feedId])

  const fetchTransactions = useCallback(async () => {
    try {
      const url = statusFilter
        ? `/api/bank-feeds/${feedId}/transactions?status=${statusFilter}`
        : `/api/bank-feeds/${feedId}/transactions`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data)
      }
    } catch {
      // handle silently
    }
  }, [feedId, statusFilter])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  useEffect(() => {
    if (feed) fetchTransactions()
  }, [feed, fetchTransactions])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch(`/api/bank-feeds/${feedId}/sync`, {
        method: "POST",
      })
      if (res.ok) {
        fetchFeed()
        fetchTransactions()
      }
    } finally {
      setSyncing(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    setActionLoading("status")
    try {
      const res = await fetch(`/api/bank-feeds/${feedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchFeed()
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleTransactionAction(transactionId: string, action: string) {
    setActionLoading(transactionId)
    try {
      await fetch(`/api/bank-feeds/${feedId}/transactions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, action }),
      })
      fetchTransactions()
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bank Feed</h1>
          <p className="mt-1 text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!feed) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bank Feed Not Found</h1>
          <Link href="/integrations/bank-feeds" className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700">
            Back to Bank Feeds
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/integrations" className="hover:text-slate-700">
          Integrations
        </Link>
        <span>/</span>
        <Link href="/integrations/bank-feeds" className="hover:text-slate-700">
          Bank Feeds
        </Link>
        <span>/</span>
        <span className="text-slate-900">{feed.bankName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{feed.bankName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {feed.accountName} - {feed.accountNumber}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {feed.status === "Active" && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  Sync Now
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Connection Info */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Connection Details</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Status</p>
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                feed.status === "Active"
                  ? "bg-green-100 text-green-700"
                  : feed.status === "Paused"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {feed.status}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Feed Type</p>
            <p className="mt-1 text-sm text-slate-900">{feed.feedType}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Transactions</p>
            <p className="mt-1 text-sm text-slate-900">{feed._count.transactions}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Last Sync</p>
            <p className="mt-1 text-sm text-slate-900">
              {feed.lastSyncAt
                ? new Date(feed.lastSyncAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Never"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {feed.status === "Active" && (
            <button
              onClick={() => handleStatusChange("Paused")}
              disabled={actionLoading === "status"}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              Pause Feed
            </button>
          )}
          {feed.status === "Paused" && (
            <button
              onClick={() => handleStatusChange("Active")}
              disabled={actionLoading === "status"}
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              Resume Feed
            </button>
          )}
          {feed.status !== "Disconnected" && (
            <button
              onClick={() => handleStatusChange("Disconnected")}
              disabled={actionLoading === "status"}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Disconnect
            </button>
          )}
          {feed.status === "Disconnected" && (
            <button
              onClick={() => handleStatusChange("Active")}
              disabled={actionLoading === "status"}
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
          <div className="flex gap-1 rounded-lg border border-slate-300 bg-white p-1">
            {["", "Pending", "Matched", "Created", "Ignored"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {s || "All"}
              </button>
            ))}
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              No transactions found.{" "}
              {feed.status === "Active" && "Try syncing to import new transactions."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(txn.date).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {txn.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {txn.reference}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-medium ${
                        txn.amount >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {txn.amount >= 0 ? "+" : "-"}$
                      {Math.abs(txn.amount).toLocaleString("en-AU", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {txn.category}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[txn.status] ?? STATUS_COLORS.Pending}`}
                      >
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {txn.status === "Pending" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              handleTransactionAction(txn.id, "create")
                            }
                            disabled={actionLoading === txn.id}
                            className="rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                          >
                            Create
                          </button>
                          <button
                            onClick={() =>
                              handleTransactionAction(txn.id, "ignore")
                            }
                            disabled={actionLoading === txn.id}
                            className="rounded bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                          >
                            Ignore
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
