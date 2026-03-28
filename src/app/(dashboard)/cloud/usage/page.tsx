import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function CloudUsagePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const providers = await prisma.cloudProvider.findMany({
    where: { organizationId: orgId },
  })

  const providerMap = new Map(providers.map((p) => [p.id, p.displayName]))

  const tokenUsage = await prisma.tokenUsage.findMany({
    where: { provider: { organizationId: orgId } },
    include: { provider: true },
    orderBy: { date: "desc" },
    take: 100,
  })

  const computeUsage = await prisma.computeUsage.findMany({
    where: { provider: { organizationId: orgId } },
    include: { provider: true },
    orderBy: { date: "desc" },
    take: 100,
  })

  // Token usage summary
  const totalInputTokens = tokenUsage.reduce((sum, t) => sum + t.inputTokens, 0)
  const totalOutputTokens = tokenUsage.reduce((sum, t) => sum + t.outputTokens, 0)
  const totalTokenCost = tokenUsage.reduce((sum, t) => sum + t.cost, 0)

  // Compute usage summary
  const totalComputeHours = computeUsage.reduce((sum, c) => sum + c.hours, 0)
  const totalComputeCost = computeUsage.reduce((sum, c) => sum + c.cost, 0)

  // Usage by model
  const modelUsage = new Map<string, { inputTokens: number; outputTokens: number; cost: number; count: number }>()
  for (const t of tokenUsage) {
    const existing = modelUsage.get(t.model) || { inputTokens: 0, outputTokens: 0, cost: 0, count: 0 }
    existing.inputTokens += t.inputTokens
    existing.outputTokens += t.outputTokens
    existing.cost += t.cost
    existing.count++
    modelUsage.set(t.model, existing)
  }

  const modelRows = Array.from(modelUsage.entries())
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.cost - a.cost)

  function formatTokens(count: number): string {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/cloud" className="hover:text-indigo-600">Cloud Dashboard</Link>
        <span>/</span>
        <span className="text-slate-700">Usage</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Token & Compute Usage</h1>
        <p className="mt-1 text-sm text-slate-500">
          Detailed usage tracking across all providers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Input Tokens</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatTokens(totalInputTokens)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Output Tokens</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatTokens(totalOutputTokens)}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-indigo-600">Token Cost</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{formatCurrency(totalTokenCost)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Compute Hours</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalComputeHours.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-indigo-600">Compute Cost</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{formatCurrency(totalComputeCost)}</p>
        </div>
      </div>

      {/* Usage by Model */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Usage by Model</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Model</th>
              <th className="px-6 py-3 text-right">Input Tokens</th>
              <th className="px-6 py-3 text-right">Output Tokens</th>
              <th className="px-6 py-3 text-right">Requests</th>
              <th className="px-6 py-3 text-right">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {modelRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                  No token usage recorded yet
                </td>
              </tr>
            ) : (
              modelRows.map((row) => (
                <tr key={row.model} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{row.model}</td>
                  <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                    {formatTokens(row.inputTokens)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                    {formatTokens(row.outputTokens)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                    {row.count}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-sm font-semibold tabular-nums text-slate-900">
                    {formatCurrency(row.cost)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Token Usage */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Token Usage</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3 text-right">Input</th>
                <th className="px-6 py-3 text-right">Output</th>
                <th className="px-6 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tokenUsage.slice(0, 20).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm text-slate-700">{formatDate(t.date)}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{t.provider.displayName}</td>
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{t.model}</td>
                  <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                    {formatTokens(t.inputTokens)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                    {formatTokens(t.outputTokens)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-900">
                    {formatCurrency(t.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Compute Usage */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Compute Usage</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Instance Type</th>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3 text-right">Hours</th>
                <th className="px-6 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {computeUsage.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                    No compute usage recorded yet
                  </td>
                </tr>
              ) : (
                computeUsage.slice(0, 20).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-700">{formatDate(c.date)}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{c.provider.displayName}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{c.instanceType}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{c.modelName || "\u2014"}</td>
                    <td className="px-6 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                      {c.hours.toFixed(1)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-900">
                      {formatCurrency(c.cost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
