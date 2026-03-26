"use client"

import { useState, useMemo } from "react"

type TokenRow = {
  id: string
  date: string
  provider: string
  providerId: string
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
}

type ComputeRow = {
  id: string
  date: string
  provider: string
  providerId: string
  instanceType: string
  hours: number
  cost: number
  modelName: string | null
}

type ProviderOption = {
  id: string
  displayName: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-AU").format(n)
}

export function UsageFilters({
  tokenData,
  computeData,
  providers,
}: {
  tokenData: TokenRow[]
  computeData: ComputeRow[]
  providers: ProviderOption[]
}) {
  const [providerFilter, setProviderFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const filteredTokens = useMemo(() => {
    return tokenData.filter((t) => {
      if (providerFilter && t.providerId !== providerFilter) return false
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo && t.date > dateTo + "T23:59:59") return false
      return true
    })
  }, [tokenData, providerFilter, dateFrom, dateTo])

  const filteredCompute = useMemo(() => {
    return computeData.filter((c) => {
      if (providerFilter && c.providerId !== providerFilter) return false
      if (dateFrom && c.date < dateFrom) return false
      if (dateTo && c.date > dateTo + "T23:59:59") return false
      return true
    })
  }, [computeData, providerFilter, dateFrom, dateTo])

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Provider
          </label>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All Providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        {(providerFilter || dateFrom || dateTo) && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setProviderFilter("")
                setDateFrom("")
                setDateTo("")
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Token Usage Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Token Usage</h2>
          <p className="text-xs text-slate-500">
            {filteredTokens.length} entries
          </p>
        </div>
        {filteredTokens.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No token usage data found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-sm text-slate-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Provider</th>
                  <th className="px-6 py-3 font-medium">Model</th>
                  <th className="px-6 py-3 font-medium text-right">
                    Input Tokens
                  </th>
                  <th className="px-6 py-3 font-medium text-right">
                    Output Tokens
                  </th>
                  <th className="px-6 py-3 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTokens.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {row.provider}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {row.model}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      {formatNumber(row.inputTokens)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      {formatNumber(row.outputTokens)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(row.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compute Usage Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Compute Usage
          </h2>
          <p className="text-xs text-slate-500">
            {filteredCompute.length} entries
          </p>
        </div>
        {filteredCompute.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No compute usage data found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-sm text-slate-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Provider</th>
                  <th className="px-6 py-3 font-medium">Instance Type</th>
                  <th className="px-6 py-3 font-medium text-right">Hours</th>
                  <th className="px-6 py-3 font-medium text-right">Cost</th>
                  <th className="px-6 py-3 font-medium">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompute.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {row.provider}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {row.instanceType}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      {row.hours.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(row.cost)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {row.modelName || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
