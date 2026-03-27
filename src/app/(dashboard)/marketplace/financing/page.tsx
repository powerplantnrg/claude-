import type { Metadata } from "next"
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PieChart,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Quarterly Financing Dashboard",
}

const quarterlyData = [
  {
    quarter: "Q1 2026",
    period: "Jan - Mar 2026",
    status: "Completed",
    totalCommitted: 75000,
    totalPaid: 75000,
    contracts: 3,
    breakdown: [
      { contract: "MKT-2026-003 - Data Analysis Pipeline", provider: "DataForge Analytics", amount: 28000, status: "Paid" },
      { contract: "MKT-2026-002 - Patent Filing Support", provider: "IP Protect Ltd", amount: 12000, status: "Paid" },
      { contract: "MKT-2026-001 - Materials Testing", provider: "LabCorp Sciences", amount: 35000, status: "Paid" },
    ],
  },
  {
    quarter: "Q2 2026",
    period: "Apr - Jun 2026",
    status: "Active",
    totalCommitted: 112000,
    totalPaid: 53000,
    contracts: 2,
    breakdown: [
      { contract: "MKT-2026-001 - Materials Testing Phase 2", provider: "LabCorp Sciences", amount: 47000, status: "Partial" },
      { contract: "MKT-2026-004 - Environmental Compliance", provider: "EnviroTest Solutions", amount: 65000, status: "Pending" },
    ],
  },
  {
    quarter: "Q3 2026",
    period: "Jul - Sep 2026",
    status: "Projected",
    totalCommitted: 85000,
    totalPaid: 0,
    contracts: 2,
    breakdown: [
      { contract: "MKT-2026-005 - Nanotechnology Characterisation", provider: "NanoTech Research", amount: 65000, status: "Scheduled" },
      { contract: "MKT-2026-004 - Environmental Compliance (cont.)", provider: "EnviroTest Solutions", amount: 20000, status: "Scheduled" },
    ],
  },
  {
    quarter: "Q4 2026",
    period: "Oct - Dec 2026",
    status: "Projected",
    totalCommitted: 40000,
    totalPaid: 0,
    contracts: 1,
    breakdown: [
      { contract: "MKT-2026-005 - Nanotechnology (Final)", provider: "NanoTech Research", amount: 40000, status: "Scheduled" },
    ],
  },
]

const statusColors: Record<string, string> = {
  Completed: "bg-slate-100 text-slate-600",
  Active: "bg-emerald-100 text-emerald-700",
  Projected: "bg-blue-100 text-blue-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Partial: "bg-amber-100 text-amber-700",
  Pending: "bg-blue-100 text-blue-700",
  Scheduled: "bg-slate-100 text-slate-600",
}

export default function FinancingDashboardPage() {
  const totalAnnual = quarterlyData.reduce((sum, q) => sum + q.totalCommitted, 0)
  const totalPaidAnnual = quarterlyData.reduce((sum, q) => sum + q.totalPaid, 0)
  const totalRemaining = totalAnnual - totalPaidAnnual
  const activeQuarter = quarterlyData.find((q) => q.status === "Active")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quarterly Financing Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Financial overview of marketplace contract spending by quarter</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-medium text-slate-500">Annual Committed</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">${totalAnnual.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-600">Total Paid</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">${totalPaidAnnual.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium text-amber-600">Remaining</p>
          </div>
          <p className="text-2xl font-bold text-amber-700">${totalRemaining.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="h-4 w-4 text-indigo-500" />
            <p className="text-sm font-medium text-indigo-600">Utilisation</p>
          </div>
          <p className="text-2xl font-bold text-indigo-700">
            {totalAnnual > 0 ? Math.round((totalPaidAnnual / totalAnnual) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Cash Flow Visual */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quarterly Spend Breakdown</h2>
        <div className="grid grid-cols-4 gap-4">
          {quarterlyData.map((q) => {
            const utilisation = q.totalCommitted > 0 ? (q.totalPaid / q.totalCommitted) * 100 : 0
            return (
              <div key={q.quarter} className="text-center">
                <p className="text-sm font-semibold text-slate-900">{q.quarter}</p>
                <p className="text-xs text-slate-500 mb-3">{q.period}</p>
                <div className="relative mx-auto w-16 h-32 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className={`absolute bottom-0 w-full rounded-b-lg transition-all ${
                      q.status === "Completed" ? "bg-slate-400" :
                      q.status === "Active" ? "bg-indigo-500" :
                      "bg-blue-200"
                    }`}
                    style={{ height: `${utilisation}%` }}
                  />
                  <div
                    className={`absolute bottom-0 w-full rounded-b-lg opacity-20 ${
                      q.status === "Completed" ? "bg-slate-400" :
                      q.status === "Active" ? "bg-indigo-500" :
                      "bg-blue-200"
                    }`}
                    style={{ height: "100%" }}
                  />
                </div>
                <p className="text-sm font-bold text-slate-900 mt-2">${(q.totalCommitted / 1000).toFixed(0)}k</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${statusColors[q.status]}`}>
                  {q.status}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quarterly Detail Cards */}
      {quarterlyData.map((q) => (
        <div key={q.quarter} className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">{q.quarter}</h2>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[q.status]}`}>
                    {q.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{q.period}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">${q.totalCommitted.toLocaleString()}</p>
                <p className="text-xs text-slate-500">${q.totalPaid.toLocaleString()} paid</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {q.breakdown.map((item, idx) => (
              <div key={idx} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.contract}</p>
                  <p className="text-xs text-slate-500">{item.provider}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">${item.amount.toLocaleString()}</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || "bg-slate-100 text-slate-700"}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
