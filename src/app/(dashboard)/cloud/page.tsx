import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import dynamic from "next/dynamic"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Infrastructure Costs",
}

const CostTrendChart = dynamic(
  () => import("@/components/charts/cloud-charts").then((m) => ({ default: m.CostTrendChart })),
  { loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-xl" /> }
)
const CostByProviderChart = dynamic(
  () => import("@/components/charts/cloud-charts").then((m) => ({ default: m.CostByProviderChart })),
  { loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-xl" /> }
)

export default async function CloudDashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const providers = await prisma.cloudProvider.findMany({
    where: { organizationId: orgId },
    include: {
      costEntries: {
        orderBy: { date: "desc" },
      },
    },
  })

  // Total cloud spend
  const allCosts = providers.flatMap((p) => p.costEntries)
  const totalSpend = allCosts.reduce((sum, c) => sum + c.amount, 0)

  // This month's spend
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthCosts = allCosts.filter(
    (c) => new Date(c.date) >= monthStart
  )
  const thisMonthSpend = thisMonthCosts.reduce((sum, c) => sum + c.amount, 0)

  // Top provider by spend
  const providerSpend = providers.map((p) => ({
    name: p.displayName,
    total: p.costEntries.reduce((sum, c) => sum + c.amount, 0),
  }))
  providerSpend.sort((a, b) => b.total - a.total)
  const topProvider = providerSpend[0]?.name ?? "N/A"

  // Cost per experiment (avg)
  const experimentCosts = allCosts.filter((c) => c.experimentId)
  const uniqueExperiments = new Set(
    experimentCosts.map((c) => c.experimentId)
  )
  const costPerExperiment =
    uniqueExperiments.size > 0
      ? experimentCosts.reduce((sum, c) => sum + c.amount, 0) /
        uniqueExperiments.size
      : 0

  // Monthly spend by provider (last 6 months)
  const months: { label: string; start: Date; end: Date }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    months.push({
      label: d.toLocaleDateString("en-AU", {
        month: "short",
        year: "2-digit",
      }),
      start: d,
      end,
    })
  }

  const monthlyData = months.map((m) => {
    const byProvider: Record<string, number> = {}
    for (const p of providers) {
      byProvider[p.displayName] = p.costEntries
        .filter((c) => {
          const d = new Date(c.date)
          return d >= m.start && d <= m.end
        })
        .reduce((sum, c) => sum + c.amount, 0)
    }
    return { label: m.label, ...byProvider }
  })

  // Data for Recharts cost trend line chart
  const costTrendData = monthlyData.map((m) => {
    const providerNames = providers.map((p) => p.displayName)
    const total = providerNames.reduce(
      (sum, name) => sum + ((m as Record<string, any>)[name] || 0),
      0
    )
    return { month: m.label, total, ...Object.fromEntries(
      providerNames.map((name) => [name, (m as Record<string, any>)[name] || 0])
    ) }
  })

  // Data for cost by provider donut chart
  const costByProviderData = providerSpend
    .filter((p) => p.total > 0)
    .map((p) => ({ name: p.name, value: p.total }))

  // Recent cost entries
  const recentCosts = allCosts
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    .slice(0, 15)

  const providerMap = new Map(providers.map((p) => [p.id, p.displayName]))

  const PROVIDER_COLORS = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-cyan-500",
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Cloud Cost Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track AI infrastructure and cloud computing costs
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/cloud/providers"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Manage Providers
          </Link>
          <Link
            href="/cloud/usage"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            View Usage
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <svg
                className="h-5 w-5 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Cloud Spend
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(totalSpend)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <svg
                className="h-5 w-5 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                This Month
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(thisMonthSpend)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <svg
                className="h-5 w-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Top Provider
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {topProvider}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <svg
                className="h-5 w-5 text-violet-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Cost/Experiment
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(costPerExperiment)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CostTrendChart
          data={costTrendData}
          providers={providers.map((p) => p.displayName)}
        />
        <CostByProviderChart data={costByProviderData} />
      </div>

      {/* Monthly Spend Chart Area */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Monthly Spend by Provider
          </h2>
        </div>
        <div className="p-6">
          {monthlyData.length === 0 || providers.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No cost data available yet.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Simple bar chart */}
              <div className="flex items-end gap-4" style={{ height: "200px" }}>
                {monthlyData.map((month) => {
                  const total = providers.reduce(
                    (sum, p) =>
                      sum +
                      ((month as Record<string, any>)[p.displayName] || 0),
                    0
                  )
                  const maxTotal = Math.max(
                    ...monthlyData.map((m) =>
                      providers.reduce(
                        (sum, p) =>
                          sum +
                          ((m as Record<string, any>)[p.displayName] || 0),
                        0
                      )
                    ),
                    1
                  )
                  const heightPct = (total / maxTotal) * 100

                  return (
                    <div
                      key={month.label}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <span className="text-xs font-medium text-slate-600">
                        {formatCurrency(total)}
                      </span>
                      <div
                        className="flex w-full flex-col-reverse rounded-t-md overflow-hidden"
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                      >
                        {providers.map((p, idx) => {
                          const val =
                            (month as Record<string, any>)[p.displayName] || 0
                          const segPct = total > 0 ? (val / total) * 100 : 0
                          if (segPct === 0) return null
                          return (
                            <div
                              key={p.id}
                              className={`${
                                PROVIDER_COLORS[idx % PROVIDER_COLORS.length]
                              }`}
                              style={{ height: `${segPct}%` }}
                            />
                          )
                        })}
                      </div>
                      <span className="text-xs text-slate-500">
                        {month.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-4 pt-2">
                {providers.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <div
                      className={`h-3 w-3 rounded-sm ${
                        PROVIDER_COLORS[idx % PROVIDER_COLORS.length]
                      }`}
                    />
                    <span className="text-xs text-slate-600">
                      {p.displayName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Cost Entries Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Cost Entries
          </h2>
        </div>
        {recentCosts.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No cost entries recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-sm text-slate-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Provider</th>
                  <th className="px-6 py-3 font-medium">Service</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCosts.map((cost) => (
                  <tr key={cost.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(cost.date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {providerMap.get(cost.providerId) ?? "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {cost.service}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {cost.description || "-"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(cost.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
