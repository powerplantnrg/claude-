import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { ScrollText, Users, Activity } from "lucide-react"

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  })

  const user = await prisma.user.findFirst({
    where: { id: (session.user as any).id },
  })

  const userCount = await prisma.user.count({
    where: { organizationId: orgId },
  })

  const accountCount = await prisma.account.count({
    where: { organizationId: orgId },
  })

  const fyMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your organization and account settings
        </p>
      </div>

      {/* Organization Details */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Organization</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Organization Name</p>
              <p className="text-sm text-slate-500">{org?.name || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">ABN</p>
              <p className="text-sm font-mono text-slate-500">{org?.abn || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Address</p>
              <p className="text-sm text-slate-500">
                {[org?.address, org?.city, org?.state, org?.postcode].filter(Boolean).join(", ") || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Country</p>
              <p className="text-sm text-slate-500">{org?.country || "Australia"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Base Currency</p>
              <p className="text-sm text-slate-500">{org?.baseCurrency || "AUD"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Financial Year End</p>
              <p className="text-sm text-slate-500">
                {org?.financialYearEnd ? fyMonths[org.financialYearEnd - 1] : "June"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Aggregated Turnover</p>
              <p className="text-sm text-slate-500">
                {org?.aggregatedTurnover ? formatCurrency(org.aggregatedTurnover) : "Not set"}
              </p>
              <p className="text-xs text-slate-400">
                Used for R&D Tax Incentive calculations (under $20M = refundable offset)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Your Account</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Name</p>
              <p className="text-sm text-slate-500">{user?.name || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Email</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Role</p>
              <p className="text-sm text-slate-500">{user?.role || "Viewer"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">System Overview</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Users</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{userCount}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Accounts</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{accountCount}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">R&D Offset Type</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {(org?.aggregatedTurnover ?? 0) < 20_000_000 ? "Refundable (43.5%)" : "Non-refundable (38.5%)"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Organization ID</p>
            <p className="mt-1 text-xs font-mono text-slate-500 truncate">{orgId}</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Administration</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
          <Link
            href="/settings/users"
            className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">User Management</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Manage team members, roles, and permissions
              </p>
            </div>
          </Link>
          <Link
            href="/settings/audit-log"
            className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <ScrollText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Audit Log</p>
              <p className="mt-0.5 text-xs text-slate-500">
                View all system activity and change history
              </p>
            </div>
          </Link>
          <Link
            href="/settings/activity"
            className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Activity Feed</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Timeline view of recent organizational activity
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* R&D Tax Incentive Info */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
        <h3 className="text-sm font-semibold text-indigo-900">R&D Tax Incentive Settings</h3>
        <p className="mt-2 text-sm text-indigo-700">
          Your organization is configured for the{" "}
          <strong>
            {(org?.aggregatedTurnover ?? 0) < 20_000_000
              ? "refundable tax offset (43.5%)"
              : "non-refundable tax offset (38.5%)"}
          </strong>{" "}
          based on your aggregated turnover of{" "}
          {org?.aggregatedTurnover ? formatCurrency(org.aggregatedTurnover) : "not set"}.
          The threshold is $20,000,000.
        </p>
        <p className="mt-2 text-xs text-indigo-600">
          To update your turnover or other organization details, contact your administrator.
        </p>
      </div>
    </div>
  )
}
