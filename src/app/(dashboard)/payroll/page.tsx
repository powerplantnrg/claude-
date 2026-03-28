"use client"

import Link from "next/link"
import {
  Users,
  DollarSign,
  Landmark,
  FileText,
  Play,
  UserPlus,
  Shield,
  ArrowRight,
} from "lucide-react"

const summaryCards = [
  { label: "Total Employees", value: "24", change: "+2 this month", icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", gradient: "from-blue-500 to-indigo-500" },
  { label: "Monthly Payroll Cost", value: "$186,450", change: "+3.2% vs last month", icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", gradient: "from-emerald-500 to-teal-500" },
  { label: "Super Liability", value: "$21,182", change: "Due 28 Apr 2026", icon: Landmark, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20", gradient: "from-violet-500 to-purple-500" },
  { label: "Tax Withheld YTD", value: "$412,890", change: "FY 2025-26", icon: FileText, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", gradient: "from-amber-500 to-orange-500" },
]

const quickActions = [
  { label: "Run Payroll", href: "/payroll/pay-runs/new", icon: Play, variant: "primary" as const },
  { label: "Add Employee", href: "/payroll/employees/new", icon: UserPlus, variant: "secondary" as const },
  { label: "Tax Strategies", href: "/payroll/tax-strategies", icon: Shield, variant: "secondary" as const },
]

const recentPayRuns = [
  { id: "pr-001", period: "1 Mar - 15 Mar 2026", employees: 24, gross: "$93,225", tax: "$22,374", super: "$10,588", net: "$60,263", status: "Completed" },
  { id: "pr-002", period: "16 Feb - 28 Feb 2026", employees: 23, gross: "$89,100", tax: "$21,384", super: "$10,105", net: "$57,611", status: "Completed" },
  { id: "pr-003", period: "1 Feb - 15 Feb 2026", employees: 23, gross: "$89,100", tax: "$21,384", super: "$10,105", net: "$57,611", status: "Completed" },
  { id: "pr-004", period: "16 Jan - 31 Jan 2026", employees: 22, gross: "$85,800", tax: "$20,592", super: "$9,733", net: "$55,475", status: "Completed" },
]

const upcomingLeave = [
  { employee: "Sarah Chen", type: "Annual Leave", start: "28 Mar 2026", end: "4 Apr 2026", days: 5, status: "Approved" },
  { employee: "James Wilson", type: "Personal Leave", start: "31 Mar 2026", end: "31 Mar 2026", days: 1, status: "Approved" },
  { employee: "Priya Sharma", type: "Annual Leave", start: "7 Apr 2026", end: "18 Apr 2026", days: 10, status: "Pending" },
  { employee: "Tom Baker", type: "Annual Leave", start: "14 Apr 2026", end: "17 Apr 2026", days: 4, status: "Pending" },
]

const statusConfig: Record<string, { dot: string; text: string; bg: string; ring: string }> = {
  Completed: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/30", ring: "ring-emerald-600/10 dark:ring-emerald-400/20" },
  Processing: { dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-900/30", ring: "ring-blue-600/10 dark:ring-blue-400/20" },
  Draft: { dot: "bg-slate-400", text: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-700", ring: "ring-slate-500/10 dark:ring-slate-400/20" },
  Approved: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/30", ring: "ring-emerald-600/10 dark:ring-emerald-400/20" },
  Pending: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-900/30", ring: "ring-amber-600/10 dark:ring-amber-400/20" },
}

export default function PayrollDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Payroll</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage payroll, employees, and tax strategies
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              {/* Top gradient accent */}
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${card.gradient}`} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{card.label}</p>
                  <p className={`mt-2 text-2xl font-bold tracking-tight ${card.color}`}>{card.value}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{card.change}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.label}
              href={action.href}
              className={
                action.variant === "primary"
                  ? "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-500/20 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/30"
                  : "inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-400"
              }
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Link>
          )
        })}
      </div>

      {/* Recent Pay Runs */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent Pay Runs</h2>
          <Link href="/payroll/pay-runs" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Period</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Employees</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Gross</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Tax</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Super</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Net Pay</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {recentPayRuns.map((run) => {
                const config = statusConfig[run.status] || statusConfig.Draft
                return (
                  <tr key={run.id} className="transition-colors duration-150 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10">
                    <td className="px-5 py-3.5 text-sm">
                      <Link href={`/payroll/pay-runs/${run.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                        {run.period}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-slate-300 tabular-nums">{run.employees}</td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{run.gross}</td>
                    <td className="px-5 py-3.5 text-right text-sm text-slate-600 dark:text-slate-400 tabular-nums">{run.tax}</td>
                    <td className="px-5 py-3.5 text-right text-sm text-slate-600 dark:text-slate-400 tabular-nums">{run.super}</td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{run.net}</td>
                    <td className="px-5 py-3.5 text-sm">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${config.bg} ${config.text} ${config.ring}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                        {run.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Leave */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Upcoming Leave</h2>
          <Link href="/payroll/leave" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
            Manage Leave <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Employee</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Type</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Start</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">End</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Days</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {upcomingLeave.map((leave, idx) => {
                const config = statusConfig[leave.status] || statusConfig.Draft
                return (
                  <tr key={idx} className="transition-colors duration-150 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10">
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900 dark:text-slate-100">{leave.employee}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-slate-300">{leave.type}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400 tabular-nums">{leave.start}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400 tabular-nums">{leave.end}</td>
                    <td className="px-5 py-3.5 text-right text-sm text-slate-700 dark:text-slate-300 tabular-nums">{leave.days}</td>
                    <td className="px-5 py-3.5 text-sm">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${config.bg} ${config.text} ${config.ring}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                        {leave.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
