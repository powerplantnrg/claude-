import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import type { Metadata } from "next"
import dynamic from "next/dynamic"
import {
  DollarSign, FolderKanban, Beaker, ShieldCheck, Plus, ArrowRight, Sparkles,
} from "lucide-react"

const RdSpendByProjectChart = dynamic(
  () => import("@/components/charts/rd-charts").then((m) => ({ default: m.RdSpendByProjectChart })),
  { ssr: false, loading: () => <div className="h-72 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl" /> }
)
const ExperimentStatusChart = dynamic(
  () => import("@/components/charts/rd-charts").then((m) => ({ default: m.ExperimentStatusChart })),
  { ssr: false, loading: () => <div className="h-72 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl" /> }
)
import { generateRecommendations } from "@/lib/rd-recommendations"

export const metadata: Metadata = {
  title: "R&D Intelligence",
}

export default async function RdDashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const [projects, experiments, rdSpend, claimDrafts, recommendations] = await Promise.all([
    prisma.rdProject.findMany({
      where: { organizationId: orgId },
      include: {
        activities: { include: { experiments: true } },
        rdExpenses: { include: { journalLine: true } },
        complianceChecklist: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.experiment.findMany({
      where: { rdActivity: { rdProject: { organizationId: orgId } } },
      include: {
        rdActivity: { include: { rdProject: true } },
        resources: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.journalLine.aggregate({
      _sum: { debit: true },
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Expense", isRdEligible: true },
      },
    }),
    prisma.rdClaimDraft.findMany({
      where: { rdProject: { organizationId: orgId } },
      orderBy: { generatedAt: "desc" },
      take: 1,
    }),
    generateRecommendations({ organizationId: orgId }),
  ])

  const totalRdSpend = rdSpend._sum.debit || 0
  const activeProjects = projects.filter((p) => p.status === "Active").length
  const allExperiments = projects.flatMap((p) => p.activities.flatMap((a) => a.experiments))
  const activeExperiments = allExperiments.filter((e) => e.status === "Running" || e.status === "Planned").length
  const offsetRate = 0.435
  const estimatedTaxOffset = totalRdSpend * offsetRate

  const statusConfig: Record<string, { dot: string; text: string; bg: string; ring: string }> = {
    Planned: { dot: "bg-slate-400", text: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-700", ring: "ring-slate-500/10" },
    Running: { dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-900/30", ring: "ring-blue-600/10" },
    Completed: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/30", ring: "ring-emerald-600/10" },
    Failed: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-900/30", ring: "ring-rose-600/10" },
  }

  const eligibilityConfig: Record<string, { dot: string; text: string; bg: string; ring: string }> = {
    Pending: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-900/30", ring: "ring-amber-600/10" },
    Eligible: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/30", ring: "ring-emerald-600/10" },
    Ineligible: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-900/30", ring: "ring-rose-600/10" },
    PartiallyEligible: { dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-900/30", ring: "ring-blue-600/10" },
  }

  const projectSpendData = projects
    .map((project) => ({
      name: project.name,
      spend: project.rdExpenses.reduce((sum, e) => sum + (e.journalLine?.debit || 0), 0),
    }))
    .filter((d) => d.spend > 0)
    .sort((a, b) => b.spend - a.spend)

  const statusCounts = new Map<string, number>()
  for (const exp of allExperiments) {
    statusCounts.set(exp.status, (statusCounts.get(exp.status) || 0) + 1)
  }
  const experimentStatusData = Array.from(statusCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const kpis = [
    { label: "Total R&D Spend", value: formatCurrency(totalRdSpend), icon: DollarSign, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20", gradient: "from-indigo-500 to-violet-500" },
    { label: "Active Projects", value: activeProjects.toString(), icon: FolderKanban, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", gradient: "from-blue-500 to-cyan-500" },
    { label: "Active Experiments", value: activeExperiments.toString(), icon: Beaker, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20", gradient: "from-violet-500 to-purple-500" },
    { label: "Est. Tax Offset", value: formatCurrency(estimatedTaxOffset), icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", gradient: "from-emerald-500 to-teal-500" },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            R&D Intelligence
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track R&D projects, experiments, and tax incentive eligibility
          </p>
        </div>
        <Link
          href="/rd/projects/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-500/20 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/30"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${kpi.gradient}`} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{kpi.label}</p>
                  <p className={`mt-2 text-2xl font-bold tracking-tight ${kpi.color}`}>{kpi.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.bg} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <RdSpendByProjectChart data={projectSpendData} />
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <ExperimentStatusChart data={experimentStatusData} />
        </div>
      </div>

      {/* Projects Overview Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Projects Overview</h2>
          <Link href="/rd/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Project Name</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Eligibility</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Spend to Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                        <FolderKanban className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No R&D projects yet</p>
                        <p className="mt-1 text-xs text-slate-400">
                          <Link href="/rd/projects/new" className="text-indigo-600 dark:text-indigo-400 hover:underline">Create your first project</Link> to start tracking R&D spend.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                projects.slice(0, 5).map((project) => {
                  const projectSpend = project.rdExpenses.reduce((sum, e) => sum + (e.journalLine?.debit || 0), 0)
                  const sc = statusConfig[project.status] || statusConfig.Planned
                  const ec = eligibilityConfig[project.eligibilityStatus] || eligibilityConfig.Pending
                  return (
                    <tr key={project.id} className="transition-colors duration-150 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10">
                      <td className="px-5 py-3.5">
                        <Link href={`/rd/projects/${project.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors">
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {project.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${ec.bg} ${ec.text} ${ec.ring}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ec.dot}`} />
                          {project.eligibilityStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatCurrency(projectSpend)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">AI Recommendations</h2>
            </div>
            <Link href="/rd/recommendations" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors">
              View All ({recommendations.length}) <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {recommendations.slice(0, 3).map((rec) => {
              const priorityConfig = {
                high: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-900/30", ring: "ring-rose-600/10" },
                medium: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-900/30", ring: "ring-amber-600/10" },
                low: { dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-900/30", ring: "ring-blue-600/10" },
              }
              const pc = priorityConfig[rec.priority as keyof typeof priorityConfig] || priorityConfig.low
              return (
                <div key={rec.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${pc.bg} ${pc.text} ${pc.ring}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${pc.dot}`} />
                        {rec.priority}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{rec.category}</span>
                    </div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{rec.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 truncate">{rec.description}</p>
                  </div>
                  <Link
                    href={rec.actionUrl}
                    className="ml-4 shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    Take Action
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Experiments */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent Experiments</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {experiments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                  <Beaker className="h-6 w-6" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">No experiments recorded yet.</p>
              </div>
            </div>
          ) : (
            experiments.slice(0, 5).map((experiment) => {
              const sc = statusConfig[experiment.status] || statusConfig.Planned
              return (
                <div key={experiment.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{experiment.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {experiment.rdActivity.rdProject.name} &middot; {experiment.rdActivity.name}
                    </p>
                    {experiment.hypothesis && (
                      <p className="mt-1 truncate text-sm text-slate-400 dark:text-slate-500">{experiment.hypothesis}</p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">Iter #{experiment.iterationNumber}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                      {experiment.status}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
