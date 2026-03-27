"use client"

import { useState, useEffect } from "react"
import { toast } from "@/lib/toast-store"

interface Contact {
  id: string
  name: string
  email: string | null
}

interface PortalToken {
  id: string
  token: string
  contactId: string
  isActive: boolean
  expiresAt: string
  lastAccessedAt: string | null
  createdAt: string
  contact: { name: string; email: string | null }
}

export default function PortalSettingsPage() {
  const [tokens, setTokens] = useState<PortalToken[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactId, setSelectedContactId] = useState("")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const fetchTokens = async () => {
    try {
      const res = await fetch("/api/portal/tokens")
      if (res.ok) {
        const data = await res.json()
        setTokens(data)
      }
    } catch {
      toast.error("Error", "Failed to load portal tokens.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTokens()
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setContacts(data)
      })
  }, [])

  const generateToken = async () => {
    if (!selectedContactId) {
      toast.error("Validation", "Please select a contact.")
      return
    }

    setGenerating(true)
    try {
      const res = await fetch("/api/portal/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedContactId }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error("Failed", data.error || "Failed to generate token.")
        return
      }

      toast.success("Token Generated", "Portal link has been generated successfully.")
      setSelectedContactId("")
      fetchTokens()
    } catch {
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setGenerating(false)
    }
  }

  const deactivateToken = async (tokenId: string) => {
    try {
      const res = await fetch(`/api/portal/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate", tokenId }),
      })

      if (res.ok) {
        toast.success("Token Deactivated", "The portal link has been deactivated.")
        fetchTokens()
      }
    } catch {
      toast.error("Error", "Failed to deactivate token.")
    }
  }

  const copyPortalLink = (token: string) => {
    const link = `${window.location.origin}/portal/${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    toast.success("Copied", "Portal link copied to clipboard.")
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Portal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate and manage portal links for your contacts to view invoices and make payments
        </p>
      </div>

      {/* Generate new token */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Generate Portal Link
        </h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Contact
            </label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `(${c.email})` : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={generateToken}
            disabled={generating || !selectedContactId}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              "Generate Link"
            )}
          </button>
        </div>
      </div>

      {/* Tokens list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Portal Tokens
          </h2>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="h-6 w-6 mx-auto mb-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-slate-500">Loading tokens...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-slate-500">
              No portal tokens yet. Generate one above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Last Accessed
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tokens.map((t) => {
                  const isExpired = new Date(t.expiresAt) < new Date()
                  const isActiveAndValid = t.isActive && !isExpired
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="text-sm font-medium text-slate-900">
                          {t.contact.name}
                        </div>
                        {t.contact.email && (
                          <div className="text-xs text-slate-500">
                            {t.contact.email}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            isActiveAndValid
                              ? "bg-green-100 text-green-700"
                              : isExpired
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {isActiveAndValid
                            ? "Active"
                            : isExpired
                            ? "Expired"
                            : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {new Date(t.expiresAt).toLocaleDateString("en-AU")}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {t.lastAccessedAt
                          ? new Date(t.lastAccessedAt).toLocaleDateString("en-AU")
                          : "Never"}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isActiveAndValid && (
                            <>
                              <button
                                onClick={() => copyPortalLink(t.token)}
                                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                {copiedToken === t.token ? "Copied!" : "Copy Link"}
                              </button>
                              <button
                                onClick={() => deactivateToken(t.id)}
                                className="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
                              >
                                Deactivate
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
