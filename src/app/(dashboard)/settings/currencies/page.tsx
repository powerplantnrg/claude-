import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"
import { CurrencyForm } from "./currency-form"
import { ExchangeRatePanel } from "./exchange-rate-panel"

export const metadata: Metadata = {
  title: "Currencies",
}

export default async function CurrenciesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const currencies = await prisma.currency.findMany({
    where: { organizationId: orgId },
    orderBy: [{ isBase: "desc" }, { code: "asc" }],
  })

  const baseCurrency = currencies.find((c) => c.isBase)

  // Fetch recent exchange rates
  let exchangeRates: any[] = []
  try {
    exchangeRates = await prisma.exchangeRate.findMany({
      where: { organizationId: orgId },
      orderBy: { effectiveDate: "desc" },
      take: 50,
    })
  } catch {
    // Model may not exist yet
  }

  // Fetch recent FX gain/loss entries
  let fxEntries: any[] = []
  try {
    fxEntries = await prisma.fxGainLoss.findMany({
      where: { organizationId: orgId },
      orderBy: { recognizedDate: "desc" },
      take: 20,
    })
  } catch {
    // Model may not exist yet
  }

  const totalGains = fxEntries
    .filter((e) => e.gainLoss > 0)
    .reduce((sum, e) => sum + e.gainLoss, 0)
  const totalLosses = fxEntries
    .filter((e) => e.gainLoss < 0)
    .reduce((sum, e) => sum + e.gainLoss, 0)
  const netGainLoss = totalGains + totalLosses

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Currencies</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage exchange rates and supported currencies for your organization
          </p>
        </div>
        {baseCurrency && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Base Currency</p>
            <p className="text-lg font-bold text-indigo-700">
              {baseCurrency.code} ({baseCurrency.symbol})
            </p>
          </div>
        )}
      </div>

      {/* FX Gain/Loss Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">FX Gains</p>
          <p className="mt-1 text-2xl font-bold text-green-600">${fmt(totalGains)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">FX Losses</p>
          <p className="mt-1 text-2xl font-bold text-red-600">${fmt(Math.abs(totalLosses))}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Net FX Impact</p>
          <p className={`mt-1 text-2xl font-bold ${netGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
            {netGainLoss >= 0 ? "" : "-"}${fmt(Math.abs(netGainLoss))}
          </p>
        </div>
      </div>

      <CurrencyForm currencies={currencies} />

      {/* Currency Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Symbol
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Exchange Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currencies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                  No currencies configured yet. Add your first currency above.
                </td>
              </tr>
            )}
            {currencies.map((currency) => (
              <tr key={currency.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono font-medium text-slate-900">
                  {currency.code}
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">
                  {currency.name}
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">
                  {currency.symbol}
                </td>
                <td className="px-6 py-4 text-sm text-right font-mono text-slate-900">
                  {currency.exchangeRate.toFixed(4)}
                </td>
                <td className="px-6 py-4">
                  {currency.isBase ? (
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                      Base Currency
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-right text-slate-500">
                  {new Date(currency.updatedAt).toLocaleDateString("en-AU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Exchange Rates & Revaluation Panel */}
      <ExchangeRatePanel
        exchangeRates={exchangeRates}
        fxEntries={fxEntries}
        baseCurrency={baseCurrency?.code || "AUD"}
      />

      {/* Historical Rates Chart Placeholder */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Historical Rates</h2>
        <p className="text-sm text-slate-500 mb-4">
          Exchange rate trends over time
        </p>
        <div className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-400">
            Chart will be available when rate history is populated
          </p>
        </div>
      </div>

      <div className="flex justify-start">
        <Link
          href="/settings"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Back to Settings
        </Link>
      </div>
    </div>
  )
}
