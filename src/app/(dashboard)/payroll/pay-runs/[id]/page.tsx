"use client"

import { useState } from "react"
import { use } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, Clock, AlertCircle } from "lucide-react"

const payRun = {
  id: "pr-001",
  period: "1 Mar - 15 Mar 2026",
  payDate: "18 Mar 2026",
  frequency: "Fortnightly",
  status: "Completed",
  totalGross: 93225.0,
  totalTax: 22374.0,
  totalSuper: 10588.88,
  totalNet: 60262.12,
  createdAt: "14 Mar 2026",
  processedAt: "17 Mar 2026",
  approvedBy: "Admin",
}

const payslips = [
  { id: "ps-001", employee: "Sarah Chen", role: "Senior Engineer", gross: 5576.92, tax: 1338.46, super: 641.35, net: 4238.46, status: "Paid" },
  { id: "ps-002", employee: "James Wilson", role: "Product Manager", gross: 5192.31, tax: 1246.15, super: 597.12, net: 3946.16, status: "Paid" },
  { id: "ps-003", employee: "Priya Sharma", role: "Data Scientist", gross: 5000.0, tax: 1200.0, super: 575.0, net: 3800.0, status: "Paid" },
  { id: "ps-004", employee: "Tom Baker", role: "DevOps Engineer", gross: 4807.69, tax: 1153.85, super: 552.88, net: 3653.84, status: "Paid" },
  { id: "ps-005", employee: "Emily Zhang", role: "UX Designer", gross: 4423.08, tax: 1061.54, super: 508.65, net: 3361.54, status: "Paid" },
  { id: "ps-006", employee: "Michael Lee", role: "Frontend Developer", gross: 2500.0, tax: 600.0, super: 287.5, net: 1900.0, status: "Paid" },
  { id: "ps-007", employee: "Anna Roberts", role: "R&D Researcher", gross: 4615.38, tax: 1107.69, super: 553.85, net: 3507.69, status: "Paid" },
  { id: "ps-008", employee: "Lisa Nguyen", role: "QA Lead", gross: 4230.77, tax: 1015.38, super: 486.54, net: 3215.39, status: "Paid" },
]

const fmt = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const statusBadge: Record<string, string> = {
  Completed: "bg-emerald-100 text-emerald-700",
  Processing: "bg-blue-100 text-blue-700",
  Draft: "bg-gray-100 text-gray-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Approved: "bg-indigo-100 text-indigo-700",
}

const statusIcon: Record<string, React.ElementType> = {
  Completed: CheckCircle,
  Processing: Clock,
  Draft: AlertCircle,
}

export default function PayRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const StatusIcon = statusIcon[payRun.status] || Clock

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/pay-runs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pay Runs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Pay Run: {payRun.period}</h1>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[payRun.status]}`}>
              <StatusIcon className="h-3 w-3" />
              {payRun.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Pay Date: {payRun.payDate} | {payRun.frequency}</p>
        </div>
        <div className="flex items-center gap-3">
          {payRun.status === "Draft" && (
            <>
              <button className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors">
                Approve & Process
              </button>
            </>
          )}
          {payRun.status === "Completed" && (
            <button className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
              Download Summary
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Gross Pay</p>
          <p className="mt-1 text-xl font-bold text-slate-900">${fmt(payRun.totalGross)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Tax Withheld</p>
          <p className="mt-1 text-xl font-bold text-slate-900">${fmt(payRun.totalTax)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Super</p>
          <p className="mt-1 text-xl font-bold text-slate-900">${fmt(payRun.totalSuper)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Net Pay</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">${fmt(payRun.totalNet)}</p>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Payslips ({payslips.length})</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Employee</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Gross</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Tax</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Super</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Net Pay</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payslips.map((slip) => (
              <tr key={slip.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{slip.employee}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{slip.role}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">${fmt(slip.gross)}</td>
                <td className="px-6 py-4 text-right text-sm text-slate-600">${fmt(slip.tax)}</td>
                <td className="px-6 py-4 text-right text-sm text-slate-600">${fmt(slip.super)}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">${fmt(slip.net)}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[slip.status] || "bg-gray-100 text-gray-700"}`}>
                    {slip.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <Link href={`/payroll/payslips/${slip.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                    View Payslip
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Metadata */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Pay Run Details</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Created</p>
            <p className="text-sm text-slate-900">{payRun.createdAt}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Processed</p>
            <p className="text-sm text-slate-900">{payRun.processedAt}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Approved By</p>
            <p className="text-sm text-slate-900">{payRun.approvedBy}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Employees</p>
            <p className="text-sm text-slate-900">{payslips.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
