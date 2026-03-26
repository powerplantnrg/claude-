"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Users,
  DollarSign,
  Landmark,
  FileText,
  Play,
  UserPlus,
  Shield,
  Calendar,
  ArrowRight,
} from "lucide-react"

const summaryCards = [
  { label: "Total Employees", value: "24", change: "+2 this month", icon: Users, color: "text-blue-600 bg-blue-100" },
  { label: "Monthly Payroll Cost", value: "$186,450", change: "+3.2% vs last month", icon: DollarSign, color: "text-emerald-600 bg-emerald-100" },
  { label: "Super Liability", value: "$21,182", change: "Due 28 Apr 2026", icon: Landmark, color: "text-violet-600 bg-violet-100" },
  { label: "Tax Withheld YTD", value: "$412,890", change: "FY 2025-26", icon: FileText, color: "text-amber-600 bg-amber-100" },
]

const quickActions = [
  { label: "Run Payroll", href: "/payroll/pay-runs/new", icon: Play, color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "Add Employee", href: "/payroll/employees/new", icon: UserPlus, color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { label: "View Tax Strategies", href: "/payroll/tax-strategies", icon: Shield, color: "bg-violet-600 hover:bg-violet-700 text-white" },
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

const statusBadge: Record<string, string> = {
  Completed: "bg-emerald-100 text-emerald-700",
  Processing: "bg-blue-100 text-blue-700",
  Draft: "bg-gray-100 text-gray-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
}

export default function PayrollDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage payroll, employees, and tax strategies
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{card.change}</p>
                </div>
                <div className={`rounded-lg p-3 ${card.color}`}>
                  <Icon className="h-5 w-5" />
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
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${action.color}`}
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Link>
          )
        })}
      </div>

      {/* Recent Pay Runs */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent Pay Runs</h2>
          <Link href="/payroll/pay-runs" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Period</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Employees</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Gross</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Tax</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Super</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Net Pay</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentPayRuns.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm">
                    <Link href={`/payroll/pay-runs/${run.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                      {run.period}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{run.employees}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">{run.gross}</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-600">{run.tax}</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-600">{run.super}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">{run.net}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[run.status] || "bg-gray-100 text-gray-700"}`}>
                      {run.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Leave */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Upcoming Leave</h2>
          <Link href="/payroll/leave" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
            Manage Leave <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Start</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">End</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Days</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {upcomingLeave.map((leave, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{leave.employee}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{leave.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{leave.start}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{leave.end}</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-700">{leave.days}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[leave.status] || "bg-gray-100 text-gray-700"}`}>
                      {leave.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
