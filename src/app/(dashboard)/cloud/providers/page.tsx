import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function CloudProvidersPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const providers = await prisma.cloudProvider.findMany({
    where: { organizationId: orgId },
    include: {
      _count: {
        select: { costEntries: true, computeUsage: true, tokenUsage: true },
      },
      costEntries: {
        orderBy: { date: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Calculate total spend per provider
  const providerCosts = await Promise.all(
    providers.map(async (p) => {
      const costs = await prisma.cloudCostEntry.aggregate({
        where: { providerId: p.id },
        _sum: { amount: true },
      })
      return { id: p.id, totalSpend: costs._sum.amount || 0 }
    })
  )

  const costMap = new Map(providerCosts.map((c) => [c.id, c.totalSpend]))

  const KNOWN_PROVIDERS = [
    { name: "openai", displayName: "OpenAI", description: "GPT models, DALL-E, Whisper" },
    { name: "anthropic", displayName: "Anthropic", description: "Claude models" },
    { name: "aws", displayName: "AWS", description: "EC2, SageMaker, Bedrock" },
    { name: "gcp", displayName: "Google Cloud", description: "Vertex AI, Compute Engine" },
    { name: "azure", displayName: "Azure", description: "Azure OpenAI, VMs, ML" },
    { name: "replicate", displayName: "Replicate", description: "Open-source model hosting" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/cloud" className="hover:text-indigo-600">Cloud Dashboard</Link>
        <span>/</span>
        <span className="text-slate-700">Providers</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cloud Providers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure and manage your AI infrastructure providers
          </p>
        </div>
      </div>

      {/* Existing Providers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{provider.displayName}</h3>
                <p className="text-xs text-slate-400 font-mono">{provider.name}</p>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  provider.enabled
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {provider.enabled ? "Active" : "Disabled"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Total Spend</p>
                <p className="text-lg font-bold text-slate-900">
                  ${(costMap.get(provider.id) || 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cost Entries</p>
                <p className="text-lg font-bold text-slate-900">
                  {provider._count.costEntries}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-4 text-xs text-slate-500">
              <span>{provider._count.computeUsage} compute records</span>
              <span>{provider._count.tokenUsage} token records</span>
            </div>

            {provider.costEntries[0] && (
              <p className="mt-3 text-xs text-slate-400">
                Last entry: {formatDate(provider.costEntries[0].date)}
              </p>
            )}
          </div>
        ))}
      </div>

      {providers.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
          </svg>
          <p className="mt-2 text-sm text-slate-500">No cloud providers configured yet</p>
          <p className="text-xs text-slate-400">Add providers via the API to start tracking costs</p>
        </div>
      )}

      {/* Quick Setup Guide */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Available Providers</h2>
          <p className="text-sm text-slate-500">Common AI/cloud providers you can add</p>
        </div>
        <div className="divide-y divide-slate-100">
          {KNOWN_PROVIDERS.map((kp) => {
            const exists = providers.some((p) => p.name === kp.name)
            return (
              <div key={kp.name} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{kp.displayName}</p>
                  <p className="text-xs text-slate-500">{kp.description}</p>
                </div>
                {exists ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Connected
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    Not configured
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
