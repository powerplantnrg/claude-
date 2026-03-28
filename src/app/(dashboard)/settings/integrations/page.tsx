import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Integrations",
}

const INTEGRATION_TYPES = [
  {
    type: "xero",
    name: "Xero",
    description: "Sync your chart of accounts, invoices, bills, and bank transactions with Xero.",
    color: "bg-blue-100 text-blue-700",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    icon: "X",
    comingSoon: true,
  },
  {
    type: "stripe",
    name: "Stripe",
    description: "Accept online payments for invoices and automatically reconcile transactions.",
    color: "bg-purple-100 text-purple-700",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    icon: "S",
    comingSoon: true,
  },
  {
    type: "slack",
    name: "Slack",
    description: "Receive notifications for invoices, payments, and R&D milestones in your Slack channels.",
    color: "bg-green-100 text-green-700",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    icon: "#",
    comingSoon: true,
  },
  {
    type: "github",
    name: "GitHub",
    description: "Track R&D activities by linking commits and pull requests to experiments and projects.",
    color: "bg-gray-100 text-gray-700",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
    icon: "G",
    comingSoon: true,
  },
  {
    type: "webhook",
    name: "Custom Webhook",
    description: "Send real-time event notifications to any URL endpoint when key actions occur.",
    color: "bg-indigo-100 text-indigo-700",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    icon: "W",
    comingSoon: false,
  },
]

export default async function IntegrationsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const integrations = await prisma.integration.findMany({
    where: { organizationId: orgId },
  })

  const webhookCount = await prisma.webhook.count({
    where: { organizationId: orgId },
  })

  // Build a map of connected integration types
  const connectedMap = new Map<string, { id: string; isActive: boolean; lastSyncAt: Date | null }>()
  for (const integration of integrations) {
    connectedMap.set(integration.type, {
      id: integration.id,
      isActive: integration.isActive,
      lastSyncAt: integration.lastSyncAt,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect external services to extend your R&D Financial OS
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {INTEGRATION_TYPES.map((integ) => {
          const connected = connectedMap.get(integ.type)
          const isWebhook = integ.type === "webhook"

          return (
            <div
              key={integ.type}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${integ.iconBg}`}
                >
                  <span className={`text-xl font-bold ${integ.iconColor}`}>
                    {integ.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {integ.name}
                    </h3>
                    {integ.comingSoon ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Coming Soon
                      </span>
                    ) : isWebhook && webhookCount > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        {webhookCount} Active
                      </span>
                    ) : connected?.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {integ.description}
                  </p>
                </div>
              </div>

              {connected?.lastSyncAt && (
                <p className="mt-3 text-xs text-slate-400">
                  Last synced:{" "}
                  {new Date(connected.lastSyncAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}

              <div className="mt-auto pt-4">
                {isWebhook ? (
                  <Link
                    href="/settings/webhooks"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    Configure Webhooks
                  </Link>
                ) : (
                  <button
                    disabled
                    className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed"
                  >
                    Configure
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
