"use client"

import Link from "next/link"
import { Play } from "lucide-react"

const payRuns = [
  { id: "pr-001", period: "1 Mar - 15 Mar 2026", payDate: "18 Mar 2026", employees: 24, gross: "$93,225.00", tax: "$22,374.00", super: "$10,588.88", net: "$60,262.12", status: "Completed" },
  { id: "pr-002", period: "16 Feb - 28 Feb 2026", payDate: "4 Mar 2026", employees: 23, gross: "$89,100.00", tax: "$21,384.00", super: "$10,105.50", net: "$57,610.50", status: "Completed" },
  { id: "pr-003", period: "1 Feb - 15 Feb 2026", payDate: "18 Feb 2026", employees: 23, gross: "$89,100.00", tax: "$21,384.00", super: "$10,105.50", net: "$57,610.50", status: "Completed" },
  { id: "pr-004", period: "16 Jan - 31 Jan 2026", payDate: "4 Feb 2026", employees: 22, gross: "$85,800.00", tax: "$20,592.00", super: "$9,732.60", net: "$55,475.40", status: "Completed" },
  { id: "pr-005", period: "1 Jan - 15 Jan 2026", payDate: "18 Jan 2026", employees: 22, gross: "$85,800.00", tax: "$20,592.00", super: "$9,732.60", net: "$55,475.40", status: "Completed" },
  { id: "pr-006", period: "16 Mar - 31 Mar 2026", payDate: "1 Apr 2026", employees: 24, gross: "$93,225.00", tax: "$22,374.00", super: "$10,588.88", net: "$60,262.12", status: "Draft" },
]

const statusBadge: Record<string, string> = {
  Completed: "bg-emerald-100 text-emerald-700",
  Processing: "bg-blue-100 text-blue-700",
  Draft: "bg-gray-100 text-gray-700",
  Approved: "bg-indigo-100 text-indigo-700",
  Rejected: "bg-red-100 text-red-700",
}

export default function PayRunsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pay Runs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Process and manage payroll runs
          </p>
        </div>
        <Link
          href="/payroll/pay-runs/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Play className="mr-2 h-4 w-4" />
          New Pay Run
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Pay Runs (FY)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">18</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Paid (FY)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">$1,025,696.04</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Next Pay Date</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">1 Apr 2026</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Period</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Pay Date</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Employees</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Gross</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Tax</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Super</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Net Pay</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payRuns.map((run) => (
              <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm">
                  <Link href={`/payroll/pay-runs/${run.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                    {run.period}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{run.payDate}</td>
                <td className="px-6 py-4 text-right text-sm text-slate-700">{run.employees}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">{run.gross}</td>
                <td className="px-6 py-4 text-right text-sm text-slate-600">{run.tax}</td>
                <td className="px-6 py-4 text-right text-sm text-slate-600">{run.super}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">{run.net}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[run.status] || "bg-gray-100 text-gray-700"}`}>
                    {run.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <Link href={`/payroll/pay-runs/${run.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
