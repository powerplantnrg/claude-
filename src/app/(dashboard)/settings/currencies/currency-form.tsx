"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  exchangeRate: number
  isBase: boolean
}

const COMMON_CURRENCIES = [
  { code: "AUD", name: "Australian Dollar", symbol: "$" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "\u20AC" },
  { code: "GBP", name: "British Pound", symbol: "\u00A3" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "$" },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00A5" },
  { code: "CNY", name: "Chinese Yuan", symbol: "\u00A5" },
]

interface CurrencyFormProps {
  currencies: Currency[]
}

export function CurrencyForm({ currencies }: CurrencyFormProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [symbol, setSymbol] = useState("")
  const [exchangeRate, setExchangeRate] = useState("1.0")
  const [isBase, setIsBase] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // For editing exchange rates inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRate, setEditRate] = useState("")

  function selectCommonCurrency(common: (typeof COMMON_CURRENCIES)[number]) {
    setCode(common.code)
    setName(common.name)
    setSymbol(common.symbol)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!code || !name || !symbol) {
      setError("Code, name, and symbol are required.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase(),
          name,
          symbol,
          exchangeRate: parseFloat(exchangeRate) || 1.0,
          isBase,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to add currency.")
        return
      }

      // Reset form
      setCode("")
      setName("")
      setSymbol("")
      setExchangeRate("1.0")
      setIsBase(false)
      setShowForm(false)
      router.refresh()
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateRate(id: string) {
    const rate = parseFloat(editRate)
    if (isNaN(rate) || rate <= 0) return

    try {
      const res = await fetch("/api/currencies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, exchangeRate: rate }),
      })

      if (res.ok) {
        setEditingId(null)
        setEditRate("")
        router.refresh()
      }
    } catch {
      // silent fail
    }
  }

  const existingCodes = new Set(currencies.map((c) => c.code))

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Currency
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Currency</h2>

          {/* Quick select common currencies */}
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Quick Select</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_CURRENCIES.filter((c) => !existingCodes.has(c.code)).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCommonCurrency(c)}
                  className={`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    code === c.code
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="USD"
                  maxLength={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="US Dollar"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="$"
                  maxLength={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Exchange Rate
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isBase"
                checked={isBase}
                onChange={(e) => setIsBase(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isBase" className="text-sm text-slate-700">
                Set as base currency
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Adding..." : "Add Currency"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setError("")
                }}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
