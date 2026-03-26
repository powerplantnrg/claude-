"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/toast-store"

interface RuleData {
  id: string
  name: string
  matchField: string
  matchType: string
  matchValue: string
  accountId: string
  accountName: string
  contactId: string | null
  taxType: string | null
  rdProjectId: string | null
  isActive: boolean
  priority: number
}

interface Option {
  id: string
  label: string
}

interface MatchedTransaction {
  id: string
  date: string
  description: string
  amount: number
  reference: string | null
}

interface RuleFormProps {
  rules: RuleData[]
  accounts: Option[]
  contacts: Option[]
  rdProjects: Option[]
}

const MATCH_FIELDS = [
  { value: "description", label: "Description" },
  { value: "amount", label: "Amount" },
  { value: "reference", label: "Reference" },
]

const MATCH_TYPES = [
  { value: "contains", label: "Contains" },
  { value: "exact", label: "Exact Match" },
  { value: "startsWith", label: "Starts With" },
  { value: "regex", label: "Regex" },
]

const TAX_TYPES = [
  { value: "", label: "None" },
  { value: "GST", label: "GST (10%)" },
  { value: "GST Free", label: "GST Free" },
  { value: "BAS Excluded", label: "BAS Excluded" },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount)
}

export default function RuleForm({ rules, accounts, contacts, rdProjects }: RuleFormProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState("")
  const [matchField, setMatchField] = useState("description")
  const [matchType, setMatchType] = useState("contains")
  const [matchValue, setMatchValue] = useState("")
  const [accountId, setAccountId] = useState("")
  const [contactId, setContactId] = useState("")
  const [taxType, setTaxType] = useState("")
  const [rdProjectId, setRdProjectId] = useState("")
  const [priority, setPriority] = useState(0)

  const [submitting, setSubmitting] = useState(false)
  const [testResults, setTestResults] = useState<MatchedTransaction[] | null>(null)
  const [testing, setTesting] = useState(false)

  const resetForm = useCallback(() => {
    setName("")
    setMatchField("description")
    setMatchType("contains")
    setMatchValue("")
    setAccountId("")
    setContactId("")
    setTaxType("")
    setRdProjectId("")
    setPriority(0)
    setEditingId(null)
    setTestResults(null)
  }, [])

  const openNew = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (rule: RuleData) => {
    setName(rule.name)
    setMatchField(rule.matchField)
    setMatchType(rule.matchType)
    setMatchValue(rule.matchValue)
    setAccountId(rule.accountId)
    setContactId(rule.contactId || "")
    setTaxType(rule.taxType || "")
    setRdProjectId(rule.rdProjectId || "")
    setPriority(rule.priority)
    setEditingId(rule.id)
    setShowForm(true)
    setTestResults(null)
  }

  const handleTest = async () => {
    if (!matchField || !matchType || !matchValue) {
      toast.warning("Missing fields", "Please fill in match field, type, and value to test.")
      return
    }
    setTesting(true)
    setTestResults(null)
    try {
      const res = await fetch("/api/banking/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test: { matchField, matchType, matchValue },
        }),
      })
      const data = await res.json()
      if (res.ok && data.matches) {
        setTestResults(data.matches)
        toast.info("Test Complete", `${data.matches.length} transaction(s) matched.`)
      } else {
        toast.error("Test Failed", data.error || "Could not test rule.")
      }
    } catch {
      toast.error("Error", "Failed to test rule.")
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async () => {
    if (!name || !matchField || !matchType || !matchValue || !accountId) {
      toast.error("Validation", "Name, match criteria, and account are required.")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name,
        matchField,
        matchType,
        matchValue,
        accountId,
        contactId: contactId || null,
        taxType: taxType || null,
        rdProjectId: rdProjectId || null,
        priority,
      }

      const res = await fetch("/api/banking/rules", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error("Failed", data.error || "Could not save rule.")
        return
      }

      toast.success(editingId ? "Rule Updated" : "Rule Created", `Bank rule "${name}" saved.`)
      setShowForm(false)
      resetForm()
      router.refresh()
    } catch {
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (rule: RuleData) => {
    try {
      const res = await fetch("/api/banking/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
      })
      if (res.ok) {
        toast.success("Updated", `Rule "${rule.name}" ${rule.isActive ? "disabled" : "enabled"}.`)
        router.refresh()
      }
    } catch {
      toast.error("Error", "Failed to toggle rule.")
    }
  }

  const deleteRule = async (rule: RuleData) => {
    if (!confirm(`Delete rule "${rule.name}"?`)) return
    try {
      const res = await fetch(`/api/banking/rules?id=${rule.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Deleted", `Rule "${rule.name}" deleted.`)
        router.refresh()
      }
    } catch {
      toast.error("Error", "Failed to delete rule.")
    }
  }

  const matchFieldLabel = (f: string) => MATCH_FIELDS.find((m) => m.value === f)?.label || f
  const matchTypeLabel = (t: string) => MATCH_TYPES.find((m) => m.value === t)?.label || t

  return (
    <div className="space-y-6">
      {/* Add Rule button */}
      {!showForm && (
        <button
          onClick={openNew}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Rule
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId ? "Edit Rule" : "New Bank Rule"}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AWS charges"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Match Field</label>
              <select
                value={matchField}
                onChange={(e) => setMatchField(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {MATCH_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Match Type</label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {MATCH_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Match Value</label>
              <input
                type="text"
                value={matchValue}
                onChange={(e) => setMatchValue(e.target.value)}
                placeholder="e.g. Amazon Web Services"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact (optional)</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax Type (optional)</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {TAX_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">R&D Project (optional)</label>
              <select
                value={rdProjectId}
                onChange={(e) => setRdProjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None</option>
                {rdProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving..." : editingId ? "Update Rule" : "Create Rule"}
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {testing ? "Testing..." : "Test Rule"}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Test Results */}
          {testResults !== null && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">
                Test Results: {testResults.length} transaction(s) match
              </h3>
              {testResults.length > 0 ? (
                <div className="max-h-48 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-amber-700">
                        <th className="py-1 pr-4">Date</th>
                        <th className="py-1 pr-4">Description</th>
                        <th className="py-1 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResults.slice(0, 20).map((tx) => (
                        <tr key={tx.id} className="border-t border-amber-200/50">
                          <td className="py-1 pr-4 text-amber-900">
                            {new Date(tx.date).toLocaleDateString("en-AU")}
                          </td>
                          <td className="py-1 pr-4 text-amber-900 truncate max-w-xs">
                            {tx.description}
                          </td>
                          <td className="py-1 text-right font-mono text-amber-900">
                            {formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {testResults.length > 20 && (
                    <p className="mt-2 text-xs text-amber-600">
                      Showing 20 of {testResults.length} matches
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-amber-700">No unreconciled transactions match this rule.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rules Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Match
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Account
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tax
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Priority
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                  No bank rules defined. Create one to auto-categorize transactions.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{rule.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                        {matchFieldLabel(rule.matchField)}
                      </span>
                      <span className="text-xs text-slate-400">{matchTypeLabel(rule.matchType)}</span>
                      <span className="font-mono text-xs text-slate-800">&quot;{rule.matchValue}&quot;</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{rule.accountName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{rule.taxType || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{rule.priority}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(rule)}
                      className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                        rule.isActive ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          rule.isActive ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(rule)}
                      className="mr-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteRule(rule)}
                      className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                    >
                      Delete
                    </button>
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
