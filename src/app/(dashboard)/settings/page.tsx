import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  })

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  if (!org) redirect("/login")

  const orgData = {
    id: org.id,
    name: org.name,
    abn: org.abn,
    address: org.address,
    city: org.city,
    state: org.state,
    postcode: org.postcode,
    country: org.country,
    financialYearEnd: org.financialYearEnd,
    baseCurrency: org.baseCurrency,
    aggregatedTurnover: org.aggregatedTurnover,
  }

  const userData = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }))

  const ROLE_COLORS: Record<string, string> = {
    Admin: "bg-indigo-100 text-indigo-700",
    Owner: "bg-violet-100 text-violet-700",
    Editor: "bg-blue-100 text-blue-700",
    Viewer: "bg-slate-100 text-slate-700",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your organization details and team
        </p>
      </div>

      {/* Organization Details */}
      <SettingsForm org={orgData} />

      {/* Users List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
        </div>
        {userData.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-sm text-slate-500">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userData.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {user.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ROLE_COLORS[user.role] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString("en-AU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
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
