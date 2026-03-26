import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"
import { CurrencyForm } from "./currency-form"

export const metadata: Metadata = {
  title: "Currencies",
}

export default async function CurrenciesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const currencies = await prisma.currency.findMany({
    where: { organizationId: orgId },
    orderBy: [{ isBase: "desc" }, { code: "asc" }],
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
      </div>

      <CurrencyForm currencies={currencies} />

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
