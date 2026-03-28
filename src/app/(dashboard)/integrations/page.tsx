import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Integration Hub",
}

export default async function IntegrationHubPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const [integrations, webhookCount, bankFeedCount, employeeCount] =
    await Promise.all([
      prisma.integration.findMany({
        where: { organizationId: orgId },
      }),
      prisma.webhook.count({
        where: { organizationId: orgId },
      }),
      prisma.bankFeed
        .count({
          where: { organizationId: orgId },
        })
        .catch(() => 0),
      prisma.employee.count({
        where: { organizationId: orgId, active: true },
      }),
    ])

  const activeWebhooks = await prisma.webhook.count({
    where: { organizationId: orgId, isActive: true },
  })

  let activeFeedCount = 0
  try {
    activeFeedCount = await prisma.bankFeed.count({
      where: { organizationId: orgId, status: "Active" },
    })
  } catch {
    // BankFeed model may not exist yet
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Integration Hub</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect bank feeds, lodge STP filings, export data, and manage integrations
        </p>
      </div>

      {/* Bank Feeds Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Bank Feeds</h2>
            <p className="text-sm text-slate-500">
              Connect your bank accounts for automatic transaction imports
            </p>
          </div>
          <Link
            href="/integrations/bank-feeds"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Bank Feed
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Feeds</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{bankFeedCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Active</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{activeFeedCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Paused / Disconnected</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{bankFeedCount - activeFeedCount}</p>
          </div>
        </div>
        <Link
          href="/integrations/bank-feeds"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Manage Bank Feeds
          <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </section>

      {/* STP Filing Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">STP Filing</h2>
            <p className="text-sm text-slate-500">
              Single Touch Payroll - Lodge employee payment summaries with the ATO
            </p>
          </div>
          <Link
            href="/integrations/stp"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            Lodge STP
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <span className="text-lg font-bold text-emerald-600">ATO</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {employeeCount} Active Employee{employeeCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-slate-500">
                Ready for STP Phase 2 filing
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/integrations/stp"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View STP Details
          <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </section>

      {/* Data Export Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Data Export</h2>
          <p className="text-sm text-slate-500">
            Export your data in formats compatible with Xero, MYOB, or generic CSV
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/integrations/export?format=xero-csv"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <span className="text-sm font-bold text-blue-600">X</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Xero CSV</p>
                <p className="text-xs text-slate-500">Xero-compatible format</p>
              </div>
            </div>
          </Link>
          <Link
            href="/integrations/export?format=myob-csv"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <span className="text-sm font-bold text-purple-600">M</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">MYOB CSV</p>
                <p className="text-xs text-slate-500">MYOB-compatible format</p>
              </div>
            </div>
          </Link>
          <Link
            href="/integrations/export?format=generic-csv"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <span className="text-sm font-bold text-slate-600">CSV</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Generic CSV</p>
                <p className="text-xs text-slate-500">Universal CSV format</p>
              </div>
            </div>
          </Link>
        </div>
        <Link
          href="/integrations/export"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Advanced Export Options
          <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </section>

      {/* Connected Apps Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Connected Apps</h2>
          <p className="text-sm text-slate-500">
            External service integrations
          </p>
        </div>
        {integrations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">No integrations connected yet.</p>
            <Link
              href="/settings/integrations"
              className="mt-3 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Browse available integrations
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integ) => (
              <div
                key={integ.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{integ.name}</p>
                    <p className="text-xs capitalize text-slate-500">{integ.type}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      integ.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {integ.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {integ.lastSyncAt && (
                  <p className="mt-2 text-xs text-slate-400">
                    Last synced:{" "}
                    {new Date(integ.lastSyncAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Webhooks Summary */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Webhooks</h2>
            <p className="text-sm text-slate-500">
              Real-time event notifications to external endpoints
            </p>
          </div>
          <Link
            href="/settings/webhooks"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Manage Webhooks
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Webhooks</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{webhookCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Active</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{activeWebhooks}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
