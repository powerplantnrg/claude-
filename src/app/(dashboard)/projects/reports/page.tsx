"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface ProfitabilityProject {
  id: string
  name: string
  code: string
  status: string
  projectType: string
  clientName: string
  budgetAmount: number | null
  totalCost: number
  totalTimeCost: number
  totalExpenseCost: number
  revenue: number
  profit: number
  margin: number
  totalHours: number
  billableHours: number
  budgetUsedPercent: number
}

interface ProfitabilityTotals {
  totalCost: number
  totalRevenue: number
  totalProfit: number
  totalHours: number
  totalBillableHours: number
}

interface UtilizationUser {
  id: string
  name: string
  email: string
  totalHours: number
  billableHours: number
  nonBillableHours: number
  utilizationRate: number
  projectCount: number
}

interface UtilizationTotals {
  totalHours: number
  totalBillable: number
  totalNonBillable: number
  overallUtilization: number
}

interface WipProject {
  id: string
  name: string
  code: string
  clientName: string
  unbilledTimeHours: number
  unbilledTimeAmount: number
  unbilledExpenseAmount: number
  totalUnbilled: number
  unbilledTimeEntries: number
  unbilledExpenseEntries: number
  oldestUnbilledDate: string | null
}

interface WipTotals {
  totalUnbilledTime: number
  totalUnbilledExpenses: number
  totalUnbilled: number
  projectCount: number
}

type ReportType = "profitability" | "utilization" | "wip"

export default function ProjectReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("profitability")
  const [loading, setLoading] = useState(true)

  // Profitability
  const [profitProjects, setProfitProjects] = useState<ProfitabilityProject[]>([])
  const [profitTotals, setProfitTotals] = useState<ProfitabilityTotals | null>(null)

  // Utilization
  const [utilUsers, setUtilUsers] = useState<UtilizationUser[]>([])
  const [utilTotals, setUtilTotals] = useState<UtilizationTotals | null>(null)
  const [utilStartDate, setUtilStartDate] = useState("")
  const [utilEndDate, setUtilEndDate] = useState("")

  // WIP
  const [wipProjects, setWipProjects] = useState<WipProject[]>([])
  const [wipTotals, setWipTotals] = useState<WipTotals | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: reportType })
      if (reportType === "utilization") {
        if (utilStartDate) params.set("startDate", utilStartDate)
        if (utilEndDate) params.set("endDate", utilEndDate)
      }

      const res = await fetch(`/api/projects/reports?${params.toString()}`)
      if (!res.ok) return

      const data = await res.json()

      if (reportType === "profitability") {
        setProfitProjects(data.projects)
        setProfitTotals(data.totals)
      } else if (reportType === "utilization") {
        setUtilUsers(data.users)
        setUtilTotals(data.totals)
      } else if (reportType === "wip") {
        setWipProjects(data.projects)
        setWipTotals(data.totals)
      }
    } catch (error) {
      console.error("Error fetching report:", error)
    } finally {
      setLoading(false)
    }
  }, [reportType, utilStartDate, utilEndDate])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const fmtDate = (d: string | null) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Profitability, utilization, and work-in-progress reports
          </p>
        </div>
        <Link
          href="/projects"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to Projects
        </Link>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2">
        {([
          { key: "profitability", label: "Profitability" },
          { key: "utilization", label: "Utilization" },
          { key: "wip", label: "Work in Progress" },
        ] as { key: ReportType; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setReportType(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              reportType === tab.key
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Profitability Report */}
          {reportType === "profitability" && (
            <div className="space-y-4">
              {profitTotals && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Total Cost</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">${fmt(profitTotals.totalCost)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Total Revenue</p>
                    <p className="mt-1 text-lg font-bold text-green-600">${fmt(profitTotals.totalRevenue)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Total Profit</p>
                    <p className={`mt-1 text-lg font-bold ${profitTotals.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${fmt(profitTotals.totalProfit)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Total Hours</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{profitTotals.totalHours.toFixed(1)}h</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Billable Hours</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{profitTotals.totalBillableHours.toFixed(1)}h</p>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Budget</th>
                        <th className="px-4 py-3">Cost</th>
                        <th className="px-4 py-3">Revenue</th>
                        <th className="px-4 py-3">Profit</th>
                        <th className="px-4 py-3">Margin</th>
                        <th className="px-4 py-3">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profitProjects.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <Link href={`/projects/${p.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                              {p.name}
                            </Link>
                            <div className="text-xs text-slate-400">{p.code}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.clientName}</td>
                          <td className="px-4 py-3 text-slate-600">{p.status}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {p.budgetAmount ? `$${fmt(p.budgetAmount)}` : "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">${fmt(p.totalCost)}</td>
                          <td className="px-4 py-3 text-green-600">${fmt(p.revenue)}</td>
                          <td className={`px-4 py-3 font-medium ${p.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ${fmt(p.profit)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.margin > 20 ? "bg-green-100 text-green-700" :
                              p.margin > 0 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {p.margin}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {p.totalHours.toFixed(1)}h
                            <span className="text-xs text-slate-400"> ({p.billableHours.toFixed(1)} bill.)</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Utilization Report */}
          {reportType === "utilization" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="date"
                  value={utilStartDate}
                  onChange={(e) => setUtilStartDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={utilEndDate}
                  onChange={(e) => setUtilEndDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {utilTotals && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Overall Utilization</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{utilTotals.overallUtilization}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Total Hours</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{utilTotals.totalHours.toFixed(1)}h</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Billable</p>
                    <p className="mt-1 text-lg font-bold text-green-600">{utilTotals.totalBillable.toFixed(1)}h</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Non-Billable</p>
                    <p className="mt-1 text-lg font-bold text-slate-500">{utilTotals.totalNonBillable.toFixed(1)}h</p>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {utilUsers.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">No time entries found for this period.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Total Hours</th>
                          <th className="px-4 py-3">Billable</th>
                          <th className="px-4 py-3">Non-Billable</th>
                          <th className="px-4 py-3">Utilization</th>
                          <th className="px-4 py-3">Projects</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {utilUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-700">{u.name}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{u.totalHours.toFixed(1)}h</td>
                            <td className="px-4 py-3 text-green-600">{u.billableHours.toFixed(1)}h</td>
                            <td className="px-4 py-3 text-slate-500">{u.nonBillableHours.toFixed(1)}h</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-20 rounded-full bg-slate-200">
                                  <div
                                    className={`h-2 rounded-full ${
                                      u.utilizationRate > 75 ? "bg-green-500" :
                                      u.utilizationRate > 50 ? "bg-yellow-500" :
                                      "bg-red-500"
                                    }`}
                                    style={{ width: `${Math.min(u.utilizationRate, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-slate-600">{u.utilizationRate}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{u.projectCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WIP Report */}
          {reportType === "wip" && (
            <div className="space-y-4">
              {wipTotals && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Total Unbilled</p>
                    <p className="mt-1 text-2xl font-bold text-amber-600">${fmt(wipTotals.totalUnbilled)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Unbilled Time</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">${fmt(wipTotals.totalUnbilledTime)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Unbilled Expenses</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">${fmt(wipTotals.totalUnbilledExpenses)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">Projects with WIP</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{wipTotals.projectCount}</p>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {wipProjects.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">No unbilled work in progress.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                          <th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3">Client</th>
                          <th className="px-4 py-3">Unbilled Time</th>
                          <th className="px-4 py-3">Unbilled Hours</th>
                          <th className="px-4 py-3">Unbilled Expenses</th>
                          <th className="px-4 py-3">Total Unbilled</th>
                          <th className="px-4 py-3">Oldest Entry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {wipProjects.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <Link href={`/projects/${p.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                                {p.name}
                              </Link>
                              <div className="text-xs text-slate-400">{p.code}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{p.clientName}</td>
                            <td className="px-4 py-3 text-slate-700">${fmt(p.unbilledTimeAmount)}</td>
                            <td className="px-4 py-3 text-slate-600">{p.unbilledTimeHours}h</td>
                            <td className="px-4 py-3 text-slate-700">${fmt(p.unbilledExpenseAmount)}</td>
                            <td className="px-4 py-3 font-medium text-amber-600">${fmt(p.totalUnbilled)}</td>
                            <td className="px-4 py-3 text-slate-500">{fmtDate(p.oldestUnbilledDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
