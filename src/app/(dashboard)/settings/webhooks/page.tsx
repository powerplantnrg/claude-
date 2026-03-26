import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { WebhookForm } from "./webhook-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Webhooks",
}

export default async function WebhooksPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const webhooks = await prisma.webhook.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Webhooks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Send real-time notifications to external services when events occur
          </p>
        </div>
        <Link
          href="/settings/integrations"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          All Integrations
        </Link>
      </div>

      {/* Existing Webhooks */}
      {webhooks.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Configured Webhooks ({webhooks.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {webhooks.map((wh) => (
              <div key={wh.id} className="flex items-center justify-between px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {wh.name}
                    </p>
                    {wh.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Inactive
                      </span>
                    )}
                    {wh.failCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {wh.failCount} failures
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 truncate font-mono">
                    {wh.url}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {wh.events.split(",").map((event) => (
                      <span
                        key={event}
                        className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                      >
                        {event.trim()}
                      </span>
                    ))}
                  </div>
                  {wh.lastTriggeredAt && (
                    <p className="mt-1 text-xs text-slate-400">
                      Last triggered:{" "}
                      {new Date(wh.lastTriggeredAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-2 shrink-0">
                  {wh.secret && (
                    <span className="text-xs text-slate-400" title="Signature verification enabled">
                      Signed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Webhook Form */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Add Webhook</h2>
        </div>
        <div className="p-6">
          <WebhookForm />
        </div>
      </div>
    </div>
  )
}
