import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import type { Metadata } from "next"
import { Plus, BookOpen, CheckCircle2, Clock, FileText } from "lucide-react"

export const metadata: Metadata = {
  title: "Journal Entries",
}

const statusConfig: Record<string, { dot: string; text: string; bg: string; ring: string }> = {
  Draft: { dot: "bg-slate-400", text: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-700", ring: "ring-slate-500/10 dark:ring-slate-400/20" },
  Posted: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/30", ring: "ring-emerald-600/10 dark:ring-emerald-400/20" },
  Reversed: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-900/30", ring: "ring-rose-600/10 dark:ring-rose-400/20" },
}

export default async function JournalEntriesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const entries = await prisma.journalEntry.findMany({
    where: { organizationId: orgId },
    include: {
      lines: { include: { account: true } },
    },
    orderBy: { date: "desc" },
    take: 100,
  })

  const totalEntries = entries.length
  const postedCount = entries.filter((e) => e.status === "Posted").length
  const draftCount = entries.filter((e) => e.status === "Draft").length

  const stats = [
    { label: "Total Entries", value: totalEntries.toString(), icon: BookOpen, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "Posted", value: postedCount.toString(), icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Drafts", value: draftCount.toString(), icon: Clock, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-800" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Journal Entries</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View and manage manual journal entries
          </p>
        </div>
        <Link
          href="/journal-entries/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-500/20 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/30"
        >
          <Plus className="h-4 w-4" />
          New Journal Entry
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Entry #</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Date</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Reference</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Narration</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Debits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No journal entries yet</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Create your first journal entry to start recording transactions.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const config = statusConfig[entry.status] || statusConfig.Draft
                  const totalDebits = entry.lines.reduce((sum, l) => sum + l.debit, 0)
                  return (
                    <tr key={entry.id} className="transition-colors duration-150 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10">
                      <td className="px-5 py-3.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        JE-{String(entry.entryNumber).padStart(4, "0")}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                        {new Date(entry.date).toLocaleDateString("en-AU")}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400">
                        {entry.reference || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[300px] truncate">
                        {entry.narration}
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${config.bg} ${config.text} ${config.ring}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatCurrency(totalDebits)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
