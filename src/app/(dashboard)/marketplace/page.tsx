import Link from "next/link"
import type { Metadata } from "next"
import {
  Store,
  Search,
  UserPlus,
  FileText,
  Handshake,
  TrendingUp,
  ArrowRight,
  Users,
  ClipboardList,
  DollarSign,
  Briefcase,
  Beaker,
  Cpu,
  Microscope,
  FlaskConical,
  ShieldCheck,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Specialist Marketplace",
}

const categoryBreakdown = [
  { name: "Research Scientists", icon: FlaskConical, count: 24, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { name: "Lab Technicians", icon: Beaker, count: 18, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { name: "Engineering Consultants", icon: Cpu, count: 31, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { name: "IP / Patent Specialists", icon: ShieldCheck, count: 12, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { name: "Testing & QA", icon: Microscope, count: 15, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { name: "Project Managers", icon: Briefcase, count: 9, color: "text-rose-600 bg-rose-50 border-rose-200" },
]

const myRequirements = [
  { id: "REQ-001", name: "Polymer Lab Testing Suite", status: "In Market", items: 4, budget: 85000, bids: 7 },
  { id: "REQ-002", name: "AI Model Validation", status: "Published", items: 2, budget: 42000, bids: 3 },
  { id: "REQ-003", name: "Environmental Compliance Audit", status: "Draft", items: 6, budget: 120000, bids: 0 },
]

const myContracts = [
  { id: "CON-001", title: "Materials Testing - Phase 1", provider: "LabCorp Sciences", amount: 35000, progress: 65, status: "Active" },
  { id: "CON-002", title: "Patent Filing Support", provider: "IP Protect Ltd", amount: 12000, progress: 90, status: "Active" },
  { id: "CON-003", title: "Data Analysis Pipeline", provider: "DataForge Analytics", amount: 28000, progress: 100, status: "Completed" },
]

const statusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Published: "bg-blue-100 text-blue-700",
  "In Market": "bg-emerald-100 text-emerald-700",
  Fulfilled: "bg-indigo-100 text-indigo-700",
  Active: "bg-emerald-100 text-emerald-700",
  Completed: "bg-slate-100 text-slate-600",
  Disputed: "bg-red-100 text-red-700",
}

export default function MarketplacePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-8 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <Store className="h-8 w-8" />
            <h1 className="text-3xl font-bold">R&D Specialist Marketplace</h1>
          </div>
          <p className="text-lg text-indigo-100 max-w-2xl">
            Connect with verified researchers, consultants, and service providers for your R&D projects
          </p>
        </div>
      </div>

      {/* Two Paths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/marketplace/listings"
          className="group rounded-xl border-2 border-indigo-200 bg-white p-6 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
                I Need Specialists
              </h2>
              <p className="text-sm text-slate-500">Find and hire R&D service providers</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Post requirements, browse providers, receive bids, and manage contracts for your R&D projects.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 group-hover:gap-2 transition-all">
            Browse Listings <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          href="/marketplace/providers/register"
          className="group rounded-xl border-2 border-emerald-200 bg-white p-6 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-700">
                I&apos;m a Specialist
              </h2>
              <p className="text-sm text-slate-500">Register as an R&D service provider</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            List your capabilities, respond to requirements, and grow your R&D consulting business.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 group-hover:gap-2 transition-all">
            Register Now <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-medium text-slate-500">Active Listings</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">47</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium text-blue-600">Bids Received</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">23</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Handshake className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-600">Active Contracts</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">5</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-indigo-500" />
            <p className="text-sm font-medium text-indigo-600">Total Spend</p>
          </div>
          <p className="text-2xl font-bold text-indigo-700">$284,500</p>
        </div>
      </div>

      {/* Active Listings by Category */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Listings by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {categoryBreakdown.map((cat) => {
            const Icon = cat.icon
            return (
              <div
                key={cat.name}
                className={`rounded-xl border p-4 text-center ${cat.color}`}
              >
                <Icon className="h-6 w-6 mx-auto mb-2" />
                <p className="text-xs font-medium">{cat.name}</p>
                <p className="text-xl font-bold mt-1">{cat.count}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* My Requirements */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">My Requirements</h2>
          <div className="flex gap-2">
            <Link
              href="/marketplace/requirements/new"
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <FileText className="h-4 w-4" /> New Requirement
            </Link>
            <Link
              href="/marketplace/requirements"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View All
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3 text-right">Bids</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myRequirements.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono text-slate-500">{req.id}</td>
                  <td className="px-4 py-3">
                    <Link href={`/marketplace/requirements/${req.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                      {req.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[req.status]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">{req.items}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">${req.budget.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">{req.bids}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* My Contracts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">My Contracts</h2>
          <Link
            href="/marketplace/contracts"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View All
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {myContracts.map((contract) => (
            <Link
              key={contract.id}
              href={`/marketplace/contracts/${contract.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[contract.status]}`}>
                  {contract.status}
                </span>
                <span className="text-sm font-bold text-slate-900">${contract.amount.toLocaleString()}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">{contract.title}</h3>
              <p className="text-xs text-slate-500 mb-3">{contract.provider}</p>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${contract.progress === 100 ? "bg-slate-400" : "bg-indigo-500"}`}
                  style={{ width: `${contract.progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{contract.progress}% complete</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
