"use client"

import { useState } from "react"
import { Calendar, CheckCircle, XCircle, Clock } from "lucide-react"

const pendingRequests = [
  { id: "lr-001", employee: "Priya Sharma", type: "Annual Leave", start: "7 Apr 2026", end: "18 Apr 2026", days: 10, reason: "Family holiday overseas", submittedAt: "20 Mar 2026" },
  { id: "lr-002", employee: "Tom Baker", type: "Annual Leave", start: "14 Apr 2026", end: "17 Apr 2026", days: 4, reason: "Personal break", submittedAt: "22 Mar 2026" },
  { id: "lr-003", employee: "Michael Lee", type: "Personal Leave", start: "2 Apr 2026", end: "2 Apr 2026", days: 1, reason: "Medical appointment", submittedAt: "25 Mar 2026" },
]

const recentDecisions = [
  { id: "lr-004", employee: "Sarah Chen", type: "Annual Leave", start: "28 Mar 2026", end: "4 Apr 2026", days: 5, status: "Approved", decidedAt: "15 Mar 2026" },
  { id: "lr-005", employee: "James Wilson", type: "Personal Leave", start: "31 Mar 2026", end: "31 Mar 2026", days: 1, status: "Approved", decidedAt: "18 Mar 2026" },
  { id: "lr-006", employee: "Anna Roberts", type: "Annual Leave", start: "10 Mar 2026", end: "14 Mar 2026", days: 5, status: "Approved", decidedAt: "1 Mar 2026" },
]

const leaveBalances = [
  { employee: "Sarah Chen", annual: 10.5, personal: 6.0, longService: 0 },
  { employee: "James Wilson", annual: 18.0, personal: 8.5, longService: 0 },
  { employee: "Priya Sharma", annual: 12.0, personal: 7.0, longService: 0 },
  { employee: "Tom Baker", annual: 8.5, personal: 9.0, longService: 0 },
  { employee: "Emily Zhang", annual: 14.0, personal: 5.0, longService: 0 },
  { employee: "Michael Lee", annual: 6.0, personal: 4.5, longService: 0 },
  { employee: "Anna Roberts", annual: 15.0, personal: 10.0, longService: 1.2 },
  { employee: "Lisa Nguyen", annual: 11.0, personal: 7.5, longService: 0 },
]

const statusBadge: Record<string, string> = {
  Approved: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Rejected: "bg-red-100 text-red-700",
}

export default function LeavePage() {
  const [activeTab, setActiveTab] = useState<"pending" | "calendar" | "balances">("pending")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage leave requests and track employee balances
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {[
            { key: "pending" as const, label: "Pending Requests", count: pendingRequests.length },
            { key: "calendar" as const, label: "Calendar" },
            { key: "balances" as const, label: "Leave Balances" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Pending Requests */}
      {activeTab === "pending" && (
        <div className="space-y-6">
          {/* Pending */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Pending Requests</h2>
            {pendingRequests.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                <p className="text-sm text-slate-400">No pending leave requests.</p>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-slate-900">{req.employee}</h3>
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          Pending
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{req.type} - {req.days} day{req.days > 1 ? "s" : ""}</p>
                      <p className="text-sm text-slate-500">{req.start} to {req.end}</p>
                      {req.reason && <p className="mt-2 text-sm text-slate-400 italic">"{req.reason}"</p>}
                      <p className="mt-1 text-xs text-slate-400">Submitted {req.submittedAt}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Recent Decisions */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Decisions</h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Dates</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Days</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDecisions.map((dec) => (
                    <tr key={dec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{dec.employee}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{dec.type}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{dec.start} - {dec.end}</td>
                      <td className="px-6 py-4 text-right text-sm text-slate-700">{dec.days}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[dec.status]}`}>
                          {dec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Placeholder */}
      {activeTab === "calendar" && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">Leave Calendar</h3>
          <p className="mt-1 text-sm text-slate-500">
            Calendar view of team leave will be displayed here. This provides a visual overview of who is off and when.
          </p>
          <div className="mt-6 grid grid-cols-7 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="py-2 text-xs font-semibold text-slate-500">{day}</div>
            ))}
            {Array.from({ length: 35 }, (_, i) => {
              const dayNum = i - 1
              const isCurrentMonth = dayNum >= 0 && dayNum < 31
              const hasLeave = [6, 7, 8, 9, 10, 27, 28, 29, 30].includes(dayNum)
              return (
                <div
                  key={i}
                  className={`rounded p-2 text-xs ${
                    isCurrentMonth
                      ? hasLeave
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "bg-slate-50 text-slate-700"
                      : "text-slate-300"
                  }`}
                >
                  {isCurrentMonth ? dayNum + 1 : ""}
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-blue-100 border border-blue-200" /> Leave scheduled
            </span>
          </div>
        </div>
      )}

      {/* Leave Balances */}
      {activeTab === "balances" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Annual Leave (days)</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Personal Leave (days)</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Long Service (weeks)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaveBalances.map((bal) => (
                <tr key={bal.employee} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{bal.employee}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <span className={`font-medium ${bal.annual < 5 ? "text-amber-600" : "text-slate-900"}`}>
                      {bal.annual}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <span className={`font-medium ${bal.personal < 3 ? "text-amber-600" : "text-slate-900"}`}>
                      {bal.personal}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-600">{bal.longService}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
