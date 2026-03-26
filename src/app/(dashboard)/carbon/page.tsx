import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import { EmissionsByScopePie, MonthlyEmissionsTrend } from "./carbon-charts"
import { CarbonEntryForm } from "./carbon-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Carbon & Energy Accounting",
}

export default async function CarbonPage() {
  const session = await auth()
  if (!session) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const now = new Date()

  // Fetch all carbon entries for org
  const [allEntries, rdProjects, totalRevenueResult] = await Promise.all([
    prisma.carbonEntry.findMany({
      where: { organizationId: orgId },
      orderBy: { date: "desc" },
      include: {
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.rdProject.findMany({
      where: { organizationId: orgId, status: "Active" },
      select: { id: true, name: true },
    }),
    prisma.journalLine.aggregate({
      _sum: { credit: true },
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Revenue" },
      },
    }),
  ])

  const totalRevenue = totalRevenueResult._sum.credit ?? 0

  // KPI calculations
  const totalEmissionsKg = allEntries.reduce((sum, e) => sum + e.totalEmissions, 0)
  const totalEmissionsTonnes = totalEmissionsKg / 1000

  const scope1 = allEntries
    .filter((e) => e.category === "Scope1")
    .reduce((sum, e) => sum + e.totalEmissions, 0)
  const scope2 = allEntries
    .filter((e) => e.category === "Scope2")
    .reduce((sum, e) => sum + e.totalEmissions, 0)
  const scope3 = allEntries
    .filter((e) => e.category === "Scope3")
    .reduce((sum, e) => sum + e.totalEmissions, 0)

  // Carbon intensity: kg CO2e per $1000 revenue
  const carbonIntensity =
    totalRevenue > 0 ? (totalEmissionsKg / (totalRevenue / 1000)) : 0

  // Emissions per R&D project (entries linked to a project)
  const projectEntries = allEntries.filter((e) => e.projectId)
  const uniqueProjects = new Set(projectEntries.map((e) => e.projectId))
  const emissionsPerProject =
    uniqueProjects.size > 0
      ? projectEntries.reduce((sum, e) => sum + e.totalEmissions, 0) / uniqueProjects.size
      : 0

  // Pie chart data
  const scopeData = [
    { name: "Scope1", value: scope1 },
    { name: "Scope2", value: scope2 },
    { name: "Scope3", value: scope3 },
  ]

  // Monthly trend data (last 6 months)
  const monthLabels: { label: string; start: Date; end: Date }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const label = d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
    monthLabels.push({ label, start: d, end })
  }

  const monthlyTrendData = monthLabels.map((m) => {
    let s1 = 0, s2 = 0, s3 = 0
    for (const entry of allEntries) {
      const entryDate = new Date(entry.date)
      if (entryDate >= m.start && entryDate <= m.end) {
        if (entry.category === "Scope1") s1 += entry.totalEmissions
        else if (entry.category === "Scope2") s2 += entry.totalEmissions
        else if (entry.category === "Scope3") s3 += entry.totalEmissions
      }
    }
    return { month: m.label, Scope1: s1, Scope2: s2, Scope3: s3, total: s1 + s2 + s3 }
  })

  // Recent entries (last 20)
  const recentEntries = allEntries.slice(0, 20)

  const kpis = [
    {
      label: "Total Emissions",
      value: `${totalEmissionsTonnes.toFixed(2)} t`,
      sub: "tonnes CO2e",
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    {
      label: "Scope 1",
      value: `${(scope1 / 1000).toFixed(2)} t`,
      sub: "Direct emissions",
      color: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      border: "border-rose-200 dark:border-rose-800",
    },
    {
      label: "Scope 2",
      value: `${(scope2 / 1000).toFixed(2)} t`,
      sub: "Energy indirect",
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
    },
    {
      label: "Scope 3",
      value: `${(scope3 / 1000).toFixed(2)} t`,
      sub: "Other indirect",
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
    },
    {
      label: "Carbon Intensity",
      value: `${carbonIntensity.toFixed(1)} kg`,
      sub: "CO2e per $1K revenue",
      color: "text-violet-700 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      border: "border-violet-200 dark:border-violet-800",
    },
    {
      label: "Per R&D Project",
      value: `${(emissionsPerProject / 1000).toFixed(2)} t`,
      sub: "avg CO2e per project",
      color: "text-indigo-700 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      border: "border-indigo-200 dark:border-indigo-800",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Carbon & Energy Accounting
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track and manage your organization&apos;s carbon emissions across Scope 1, 2, and 3
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border ${kpi.border} ${kpi.bg} p-5 shadow-sm transition-shadow hover:shadow-md`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {kpi.label}
            </p>
            <p className={`mt-2 text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EmissionsByScopePie data={scopeData} />
        <MonthlyEmissionsTrend data={monthlyTrendData} />
      </div>

      {/* Table + Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Entries Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-700 px-4 sm:px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Recent Carbon Entries
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 sm:px-6 py-3">Date</th>
                  <th className="px-4 sm:px-6 py-3">Scope</th>
                  <th className="px-4 sm:px-6 py-3">Source</th>
                  <th className="px-4 sm:px-6 py-3 text-right">Quantity</th>
                  <th className="px-4 sm:px-6 py-3 text-right">Emissions</th>
                  <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {recentEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500"
                    >
                      No carbon entries yet. Add your first entry using the form.
                    </td>
                  </tr>
                ) : (
                  recentEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="whitespace-nowrap px-4 sm:px-6 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(entry.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            entry.category === "Scope1"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                              : entry.category === "Scope2"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {entry.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {entry.source}
                      </td>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                        {entry.quantity.toLocaleString()} {entry.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-3 text-sm text-right font-medium text-slate-700 dark:text-slate-300">
                        {entry.totalEmissions.toFixed(1)} kg
                      </td>
                      <td className="hidden sm:table-cell whitespace-nowrap px-4 sm:px-6 py-3 text-sm text-right text-slate-500 dark:text-slate-400">
                        {entry.cost != null ? formatCurrency(entry.cost) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Entry Form */}
        <CarbonEntryForm projects={rdProjects} />
      </div>
    </div>
  )
}
