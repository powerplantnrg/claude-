"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface BankFeed {
  id: string
  bankName: string
  accountNumber: string
  accountName: string
  status: string
  lastSyncAt: string | null
  feedType: string
  _count: { transactions: number }
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

export default function BankFeedsPage() {
  const [feeds, setFeeds] = useState<BankFeed[]>([])
  const [unmatchedTxns, setUnmatchedTxns] = useState<BankFeedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
    feedType: "Direct",
  })
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchFeeds = useCallback(async () => {
    try {
      const res = await fetch("/api/bank-feeds")
      if (res.ok) {
        const data = await res.json()
        setFeeds(data)

        // Fetch unmatched transactions across all feeds
        const allUnmatched: BankFeedTransaction[] = []
        for (const feed of data) {
          const txRes = await fetch(
            `/api/bank-feeds/${feed.id}/transactions?status=Pending`
          )
          if (txRes.ok) {
            const txData = await txRes.json()
            allUnmatched.push(...txData)
          }
        }
        setUnmatchedTxns(allUnmatched)
      }
    } catch {
      // handle silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeeds()
  }, [fetchFeeds])

  async function handleAddFeed(e: React.FormEvent) {
    e.preventDefault()
    setActionLoading("add")
    try {
      const res = await fetch("/api/bank-feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setShowAddForm(false)
        setFormData({
          bankName: "",
          accountNumber: "",
          accountName: "",
          feedType: "Direct",
        })
        fetchFeeds()
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleTransactionAction(
    feedId: string,
    transactionId: string,
    action: string
  ) {
    setActionLoading(transactionId)
    try {
      await fetch(`/api/bank-feeds/${feedId}/transactions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, action }),
      })
      fetchFeeds()
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bank Feeds</h1>
          <p className="mt-1 text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bank Feeds</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage bank feed connections and match transactions
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Bank Feed
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            New Bank Feed Connection
          </h2>
          <form onSubmit={handleAddFeed} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                required
                value={formData.bankName}
                onChange={(e) =>
                  setFormData({ ...formData, bankName: e.target.value })
                }
                placeholder="e.g. Commonwealth Bank"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                required
                value={formData.accountNumber}
                onChange={(e) =>
                  setFormData({ ...formData, accountNumber: e.target.value })
                }
                placeholder="e.g. 1234-5678"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account Name
              </label>
              <input
                type="text"
                required
                value={formData.accountName}
                onChange={(e) =>
                  setFormData({ ...formData, accountName: e.target.value })
                }
                placeholder="e.g. Business Transaction Account"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Feed Type
              </label>
              <select
                value={formData.feedType}
                onChange={(e) =>
                  setFormData({ ...formData, feedType: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Direct">Direct Feed</option>
                <option value="FileImport">File Import</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === "add"}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading === "add" ? "Creating..." : "Create Feed"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feeds List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Connected Feeds</h2>
        {feeds.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">No bank feeds connected yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {feeds.map((feed) => (
              <Link
                key={feed.id}
                href={`/integrations/bank-feeds/${feed.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {feed.bankName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {feed.accountName} - {feed.accountNumber}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
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
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span>{feed._count.transactions} transactions</span>
                  <span>{feed.feedType}</span>
                  {feed.lastSyncAt && (
                    <span>
                      Last sync:{" "}
                      {new Date(feed.lastSyncAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Unmatched Transactions */}
      {unmatchedTxns.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Unmatched Transactions ({unmatchedTxns.length})
          </h2>
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
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {unmatchedTxns.slice(0, 20).map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(txn.date).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {txn.description}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-medium ${
                        txn.amount >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ${Math.abs(txn.amount).toLocaleString("en-AU", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {txn.category}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            handleTransactionAction(
                              txn.bankFeedId,
                              txn.id,
                              "create"
                            )
                          }
                          disabled={actionLoading === txn.id}
                          className="rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                        >
                          Create
                        </button>
                        <button
                          onClick={() =>
                            handleTransactionAction(
                              txn.bankFeedId,
                              txn.id,
                              "ignore"
                            )
                          }
                          disabled={actionLoading === txn.id}
                          className="rounded bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        >
                          Ignore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
