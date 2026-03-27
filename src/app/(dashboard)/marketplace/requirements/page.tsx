import Link from "next/link"
import type { Metadata } from "next"
import {
  ClipboardList,
  FileText,
  Sparkles,
  Filter,
  Plus,
  DollarSign,
  CheckCircle2,
  ShoppingCart,
  ArrowRight,
} from "lucide-react"

export const metadata: Metadata = {
  title: "My Requirements",
}

const statusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Published: "bg-blue-100 text-blue-700",
  "In Market": "bg-emerald-100 text-emerald-700",
  Fulfilled: "bg-indigo-100 text-indigo-700",
}

const requirements = [
  { id: "REQ-001", project: "Polymer Lab Testing Suite", status: "In Market", items: 4, budget: 85000, startDate: "2026-01-15", endDate: "2026-06-30", bids: 7 },
  { id: "REQ-002", project: "AI Model Validation", status: "Published", items: 2, budget: 42000, startDate: "2026-02-01", endDate: "2026-05-15", bids: 3 },
  { id: "REQ-003", project: "Environmental Compliance Audit", status: "Draft", items: 6, budget: 120000, startDate: "2026-03-01", endDate: "2026-09-30", bids: 0 },
  { id: "REQ-004", project: "Battery Cell Optimization", status: "In Market", items: 3, budget: 67000, startDate: "2026-02-15", endDate: "2026-07-31", bids: 5 },
  { id: "REQ-005", project: "Bioassay Development Protocol", status: "Fulfilled", items: 5, budget: 94000, startDate: "2025-10-01", endDate: "2026-03-15", bids: 12 },
  { id: "REQ-006", project: "Materials Fatigue Analysis", status: "Draft", items: 2, budget: 31000, startDate: "2026-04-01", endDate: "2026-06-30", bids: 0 },
]

const totalBudget = requirements.reduce((sum, r) => sum + r.budget, 0)
const inMarketCount = requirements.filter((r) => r.status === "In Market").length
const fulfilledCount = requirements.filter((r) => r.status === "Fulfilled").length

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { status: filterStatus } = await searchParams

  const filtered = filterStatus && filterStatus !== "All"
    ? requirements.filter((r) => r.status === filterStatus)
    : requirements

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Requirements</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage R&D project requirements and track fulfillment
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/marketplace/requirements/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Requirement
          </Link>
          <Link
            href="/marketplace/requirements/new?mode=extract"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Sparkles className="h-4 w-4" /> Extract from Design Doc
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-medium text-slate-500">Total Requirements</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{requirements.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-600">In Market</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{inMarketCount}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-indigo-500" />
            <p className="text-sm font-medium text-indigo-600">Fulfilled</p>
          </div>
          <p className="text-2xl font-bold text-indigo-700">{fulfilledCount}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium text-blue-600">Total Budget</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">${totalBudget.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <div className="flex gap-2">
          {["All", "Draft", "Published", "In Market", "Fulfilled"].map((s) => (
            <Link
              key={s}
              href={s === "All" ? "/marketplace/requirements" : `/marketplace/requirements?status=${encodeURIComponent(s)}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                (filterStatus === s || (!filterStatus && s === "All"))
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Project Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3 text-right">Budget</th>
              <th className="px-4 py-3">Start Date</th>
              <th className="px-4 py-3">End Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-mono text-slate-500">{req.id}</td>
                <td className="px-4 py-3">
                  <Link href={`/marketplace/requirements/${req.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    {req.project}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[req.status]}`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-600">{req.items}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">${req.budget.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{new Date(req.startDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{new Date(req.endDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/marketplace/requirements/${req.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">
            No requirements match the selected filter.
          </div>
        )}
      </div>
    </div>
  )
}
