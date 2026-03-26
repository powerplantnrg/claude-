"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface ExchangeRate {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  effectiveDate: string
  source: string
}

interface FxEntry {
  id: string
  transactionType: string
  transactionId: string
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  baseCurrency: string
  exchangeRateUsed: number
  gainLoss: number
  recognizedDate: string
}

interface ExchangeRatePanelProps {
  exchangeRates: ExchangeRate[]
  fxEntries: FxEntry[]
  baseCurrency: string
}

export function ExchangeRatePanel({
  exchangeRates,
  fxEntries,
  baseCurrency,
}: ExchangeRatePanelProps) {
  const router = useRouter()
  const [showAddRate, setShowAddRate] = useState(false)
  const [fromCurrency, setFromCurrency] = useState("")
  const [toCurrency, setToCurrency] = useState(baseCurrency)
  const [rate, setRate] = useState("")
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [source, setSource] = useState("Manual")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Revaluation state
  const [revaluing, setRevaluing] = useState(false)
  const [revalResult, setRevalResult] = useState<any>(null)

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  async function handleAddRate(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!fromCurrency || !toCurrency || !rate || !effectiveDate) {
      setError("All fields are required")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/currency/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCurrency,
          toCurrency,
          rate,
          effectiveDate,
          source,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add exchange rate")
      }

      setFromCurrency("")
      setRate("")
      setShowAddRate(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevalue() {
    setRevaluing(true)
    setRevalResult(null)
    setError("")

    try {
      const res = await fetch("/api/currency/revalue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseCurrency,
          revaluationDate: new Date().toISOString().slice(0, 10),
          transactions: [],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Revaluation failed")
      }

      const data = await res.json()
      setRevalResult(data)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRevaluing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Exchange Rates Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Exchange Rates</h2>
          <div className="flex gap-2">
            <button
              onClick={handleRevalue}
              disabled={revaluing}
              className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {revaluing ? "Revaluing..." : "Revalue Foreign Balances"}
            </button>
            <button
              onClick={() => setShowAddRate(!showAddRate)}
              className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Rate
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {revalResult && (
          <div className="mx-6 mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Revaluation complete: {revalResult.entriesCreated} entries created.
            Net FX impact: ${fmt(revalResult.totalGainLoss)}
          </div>
        )}

        {showAddRate && (
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50">
            <form onSubmit={handleAddRate} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  From
                </label>
                <input
                  type="text"
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value.toUpperCase())}
                  placeholder="USD"
                  maxLength={3}
                  className="w-20 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  To
                </label>
                <input
                  type="text"
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value.toUpperCase())}
                  placeholder="AUD"
                  maxLength={3}
                  className="w-20 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Rate
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="1.5400"
                  className="w-28 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Manual">Manual</option>
                  <option value="RBA">RBA</option>
                  <option value="ECB">ECB</option>
                  <option value="API">API</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddRate(false)}
                className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pair
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Effective Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {exchangeRates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                  No exchange rates recorded yet. Add your first rate above.
                </td>
              </tr>
            )}
            {exchangeRates.map((er) => (
              <tr key={er.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 text-sm font-mono font-medium text-slate-900">
                  {er.fromCurrency}/{er.toCurrency}
                </td>
                <td className="px-6 py-3 text-sm text-right font-mono text-slate-900">
                  {er.rate.toFixed(6)}
                </td>
                <td className="px-6 py-3 text-sm text-slate-700">
                  {new Date(er.effectiveDate).toLocaleDateString("en-AU")}
                </td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {er.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FX Gain/Loss Table */}
      {fxEntries.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">FX Gain/Loss Entries</h2>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Original
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Converted
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rate Used
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Gain/Loss
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fxEntries.map((fx) => (
                <tr key={fx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-slate-700">
                    {fx.transactionType}
                  </td>
                  <td className="px-6 py-3 text-sm text-right font-mono text-slate-900">
                    {fx.originalCurrency} {fmt(fx.originalAmount)}
                  </td>
                  <td className="px-6 py-3 text-sm text-right font-mono text-slate-900">
                    {fx.baseCurrency} {fmt(fx.convertedAmount)}
                  </td>
                  <td className="px-6 py-3 text-sm text-right font-mono text-slate-600">
                    {fx.exchangeRateUsed.toFixed(6)}
                  </td>
                  <td className={`px-6 py-3 text-sm text-right font-mono font-medium ${
                    fx.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {fx.gainLoss >= 0 ? "+" : ""}{fmt(fx.gainLoss)}
                  </td>
                  <td className="px-6 py-3 text-sm text-right text-slate-500">
                    {new Date(fx.recognizedDate).toLocaleDateString("en-AU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
