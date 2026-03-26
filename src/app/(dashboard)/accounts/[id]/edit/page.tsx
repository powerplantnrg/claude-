"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Revenue", "Expense"] as const
const TAX_TYPES = ["GST", "GST Free", "BAS Excluded"] as const

interface AccountData {
  id: string
  code: string
  name: string
  type: string
  subType: string | null
  description: string | null
  taxType: string | null
  isRdEligible: boolean
  isActive: boolean
  _count: {
    journalLines: number
  }
}

export default function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<AccountData | null>(null)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [subType, setSubType] = useState("")
  const [taxType, setTaxType] = useState("")
  const [isRdEligible, setIsRdEligible] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [hasJournalLines, setHasJournalLines] = useState(false)

  useEffect(() => {
    fetch(`/api/accounts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch account")
        return res.json()
      })
      .then((data: AccountData) => {
        setAccount(data)
        setCode(data.code)
        setName(data.name)
        setType(data.type)
        setSubType(data.subType ?? "")
        setTaxType(data.taxType ?? "GST")
        setIsRdEligible(data.isRdEligible)
        setIsActive(data.isActive)
        setDescription(data.description ?? "")
        setHasJournalLines(data._count.journalLines > 0)
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load account")
        setLoading(false)
      })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!code || !name || !type) {
      setError("Code, Name, and Type are required.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          type,
          subType: subType || undefined,
          taxType: taxType || undefined,
          isRdEligible,
          isActive,
          description: description || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to update account")
        setSaving(false)
        return
      }

      router.push("/accounts")
    } catch {
      setError("Network error. Please try again.")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">Loading account...</div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Account not found.
        </div>
        <Link href="/accounts" className="text-sm text-indigo-600 hover:text-indigo-700">
          Back to Accounts
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Accounts
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update account {account.code} &mdash; {account.name}
        </p>
      </div>

      {hasJournalLines && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          This account has {account._count.journalLines} journal line(s). Account type cannot be changed.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          {/* Account Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-700">
              Account Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={hasJournalLines}
              className={`mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                hasJournalLines ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
              }`}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {hasJournalLines && (
              <p className="mt-1 text-xs text-amber-600">
                Locked: journal lines exist
              </p>
            )}
          </div>

          {/* Code */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-slate-700">
              Account Code <span className="text-red-500">*</span>
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="e.g. 1000"
              maxLength={4}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Account Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cash at Bank"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Sub Type */}
          <div>
            <label htmlFor="subType" className="block text-sm font-medium text-slate-700">
              Sub Type
            </label>
            <input
              id="subType"
              type="text"
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              placeholder="e.g. Current Asset"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Tax Type */}
          <div>
            <label htmlFor="taxType" className="block text-sm font-medium text-slate-700">
              Tax Type
            </label>
            <select
              id="taxType"
              value={taxType}
              onChange={(e) => setTaxType(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {TAX_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description for this account..."
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* R&D Eligible Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isRdEligible}
            onClick={() => setIsRdEligible(!isRdEligible)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              isRdEligible ? "bg-violet-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                isRdEligible ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <label className="text-sm font-medium text-slate-700">
            R&D Eligible
          </label>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              isActive ? "bg-emerald-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                isActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <label className="text-sm font-medium text-slate-700">
            Active
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href="/accounts"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
