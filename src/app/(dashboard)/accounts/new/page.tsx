"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Revenue", "Expense"] as const
const TAX_TYPES = ["GST", "GST Free", "BAS Excluded"] as const

const TYPE_CODE_RANGES: Record<string, { start: number; end: number }> = {
  Asset: { start: 1000, end: 1999 },
  Liability: { start: 2000, end: 2999 },
  Equity: { start: 3000, end: 3999 },
  Revenue: { start: 4000, end: 4999 },
  Expense: { start: 5000, end: 5999 },
}

interface ExistingAccount {
  id: string
  code: string
  type: string
}

export default function NewAccountPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [type, setType] = useState<string>("Asset")
  const [subType, setSubType] = useState("")
  const [taxType, setTaxType] = useState<string>("GST")
  const [isRdEligible, setIsRdEligible] = useState(false)
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [existingAccounts, setExistingAccounts] = useState<ExistingAccount[]>([])
  const [codeError, setCodeError] = useState("")

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setExistingAccounts(data)
        }
      })
      .catch(() => {})
  }, [])

  // Auto-suggest next available code when type changes
  useEffect(() => {
    if (!type) return
    const range = TYPE_CODE_RANGES[type]
    if (!range) return

    const typeCodes = existingAccounts
      .filter((a) => a.type === type)
      .map((a) => parseInt(a.code, 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b)

    let nextCode = range.start
    for (const existingCode of typeCodes) {
      if (existingCode === nextCode) {
        nextCode++
      }
    }

    if (nextCode <= range.end) {
      setCode(String(nextCode))
    }
  }, [type, existingAccounts])

  // Validate code uniqueness
  useEffect(() => {
    if (!code) {
      setCodeError("")
      return
    }
    if (!/^\d{4}$/.test(code)) {
      setCodeError("Code must be exactly 4 digits")
      return
    }
    const duplicate = existingAccounts.some((a) => a.code === code)
    if (duplicate) {
      setCodeError(`Code '${code}' is already in use`)
    } else {
      setCodeError("")
    }
  }, [code, existingAccounts])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!code || !name || !type) {
      setError("Code, Name, and Type are required.")
      return
    }

    if (codeError) {
      setError(codeError)
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          type,
          subType: subType || undefined,
          taxType: taxType || undefined,
          isRdEligible,
          description: description || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create account")
        setSaving(false)
        return
      }

      router.push("/accounts")
    } catch {
      setError("Network error. Please try again.")
      setSaving(false)
    }
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
        <h1 className="text-2xl font-semibold text-slate-900">New Account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a new account to your chart of accounts.
        </p>
      </div>

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
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Code range: {TYPE_CODE_RANGES[type]?.start}--{TYPE_CODE_RANGES[type]?.end}
            </p>
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
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm font-mono shadow-sm focus:outline-none focus:ring-1 ${
                codeError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
            />
            {codeError && (
              <p className="mt-1 text-xs text-red-600">{codeError}</p>
            )}
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
          <span className="text-xs text-slate-400">
            Mark if expenses in this account may qualify for R&D tax incentive
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Creating..." : "Create Account"}
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
