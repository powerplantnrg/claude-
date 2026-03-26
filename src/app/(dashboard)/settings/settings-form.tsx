"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type OrgData = {
  id: string
  name: string
  abn: string | null
  address: string | null
  city: string | null
  state: string | null
  postcode: string | null
  country: string
  financialYearEnd: number
  baseCurrency: string
  aggregatedTurnover: number | null
}

export function SettingsForm({ org }: { org: OrgData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(org.name)
  const [abn, setAbn] = useState(org.abn ?? "")
  const [address, setAddress] = useState(org.address ?? "")
  const [city, setCity] = useState(org.city ?? "")
  const [state, setState] = useState(org.state ?? "")
  const [postcode, setPostcode] = useState(org.postcode ?? "")
  const [country, setCountry] = useState(org.country)
  const [financialYearEnd, setFinancialYearEnd] = useState(org.financialYearEnd)
  const [baseCurrency, setBaseCurrency] = useState(org.baseCurrency)
  const [aggregatedTurnover, setAggregatedTurnover] = useState(
    org.aggregatedTurnover?.toString() ?? ""
  )
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            abn: abn || null,
            address: address || null,
            city: city || null,
            state: state || null,
            postcode: postcode || null,
            country,
            financialYearEnd,
            baseCurrency,
            aggregatedTurnover: aggregatedTurnover
              ? parseFloat(aggregatedTurnover)
              : null,
          }),
        })

        if (res.ok) {
          setMessage({ type: "success", text: "Settings updated successfully." })
          router.refresh()
        } else {
          const data = await res.json()
          setMessage({
            type: "error",
            text: data.error || "Failed to update settings.",
          })
        }
      } catch {
        setMessage({ type: "error", text: "An error occurred." })
      }
    })
  }

  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Organization Details
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Organization Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              ABN
            </label>
            <input
              type="text"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              placeholder="XX XXX XXX XXX"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Postcode
              </label>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Financial Year End
            </label>
            <select
              value={financialYearEnd}
              onChange={(e) =>
                setFinancialYearEnd(parseInt(e.target.value))
              }
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {MONTHS.map((month, idx) => (
                <option key={idx} value={idx + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Base Currency
            </label>
            <input
              type="text"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Aggregated Turnover (AUD)
            </label>
            <input
              type="number"
              step="1"
              value={aggregatedTurnover}
              onChange={(e) => setAggregatedTurnover(e.target.value)}
              placeholder="Used for R&D offset rate calculation"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
          {message && (
            <span
              className={`text-sm font-medium ${
                message.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {message.text}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
