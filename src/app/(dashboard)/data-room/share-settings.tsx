"use client"

import { useState, useEffect, useCallback } from "react"

interface DataRoomToken {
  id: string
  token: string
  name: string
  isActive: boolean
  expiresAt: string | null
  lastAccessedAt: string | null
  createdAt: string
}

export function ShareSettings() {
  const [tokens, setTokens] = useState<DataRoomToken[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/data-room")
      if (res.ok) {
        const data = await res.json()
        setTokens(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/data-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), expiresAt: expiresAt || null }),
      })
      if (res.ok) {
        setName("")
        setExpiresAt("")
        setShowForm(false)
        await fetchTokens()
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch("/api/data-room", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    })
    await fetchTokens()
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this share link?")) return
    await fetch(`/api/data-room?id=${id}`, { method: "DELETE" })
    await fetchTokens()
  }

  function copyLink(token: string, id: string) {
    const url = `${window.location.origin}/data-room/${token}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--"
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  function isExpired(expiresAt: string | null) {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Share Settings
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create shareable links for investors and board members
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          {showForm ? "Cancel" : "New Share Link"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="token-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Name
              </label>
              <input
                id="token-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Series A investors"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="token-expiry" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Expiry Date (optional)
              </label>
              <input
                id="token-expiry"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Share Link"}
            </button>
          </div>
        </form>
      )}

      {/* Token list */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">
            Loading...
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">
            No share links yet. Create one to share your data room with investors.
          </div>
        ) : (
          tokens.map((t) => {
            const expired = isExpired(t.expiresAt)
            return (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {t.name}
                    </p>
                    {!t.isActive ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                        Inactive
                      </span>
                    ) : expired ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                    <span>Created {formatDate(t.createdAt)}</span>
                    <span>Expires {t.expiresAt ? formatDate(t.expiresAt) : "Never"}</span>
                    <span>Last accessed {formatDate(t.lastAccessedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyLink(t.token, t.id)}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {copiedId === t.id ? "Copied!" : "Copy Link"}
                  </button>
                  <button
                    onClick={() => handleToggle(t.id, t.isActive)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      t.isActive
                        ? "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                    }`}
                  >
                    {t.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
