import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRightLeft,
  Plus,
  Shield,
  ScrollText,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Data Migration",
}

// Mock data for demo
const activeMigrations = [
  {
    id: "mig-001",
    name: "Xero FY2025 Full Migration",
    source: "Xero",
    status: "Import",
    progress: 68,
    totalRecords: 12450,
    importedRecords: 8466,
    failedRecords: 12,
    startedAt: "2026-03-24T10:30:00Z",
    updatedAt: "2026-03-26T08:15:00Z",
  },
  {
    id: "mig-002",
    name: "MYOB Contacts Import",
    source: "MYOB",
    status: "Review",
    progress: 45,
    totalRecords: 340,
    importedRecords: 0,
    failedRecords: 0,
    startedAt: "2026-03-25T14:00:00Z",
    updatedAt: "2026-03-26T09:00:00Z",
  },
]

const completedMigrations = [
  {
    id: "mig-000",
    name: "QuickBooks Historical Data",
    source: "QuickBooks",
    status: "Approved",
    totalRecords: 5200,
    importedRecords: 5180,
    failedRecords: 20,
    completedAt: "2026-03-10T16:30:00Z",
    rollbackDeadline: "2026-04-09T16:30:00Z",
  },
]

const sourceCards = [
  {
    name: "Xero",
    abbr: "X",
    description: "Import accounts, invoices, bills, contacts, and bank transactions from Xero.",
    color: "blue",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600",
    borderClass: "border-blue-200",
  },
  {
    name: "MYOB",
    abbr: "M",
    description: "Import chart of accounts, contacts, invoices, and payroll data from MYOB.",
    color: "purple",
    bgClass: "bg-purple-100",
    textClass: "text-purple-600",
    borderClass: "border-purple-200",
  },
  {
    name: "QuickBooks",
    abbr: "QB",
    description: "Import from QuickBooks Online including invoices, expenses, and reports.",
    color: "emerald",
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-600",
    borderClass: "border-emerald-200",
  },
  {
    name: "CSV",
    abbr: "CSV",
    description: "Import data from any system using standard CSV files.",
    color: "slate",
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
    borderClass: "border-slate-200",
  },
]

function statusBadge(status: string) {
  switch (status) {
    case "Upload":
      return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"><FileSpreadsheet className="h-3 w-3" />Upload</span>
    case "Transform":
      return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"><Loader2 className="h-3 w-3 animate-spin" />Transform</span>
    case "Review":
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"><AlertCircle className="h-3 w-3" />Review</span>
    case "Import":
      return <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700"><Loader2 className="h-3 w-3 animate-spin" />Import</span>
    case "Reconcile":
      return <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700"><ScrollText className="h-3 w-3" />Reconcile</span>
    case "Approved":
      return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"><CheckCircle2 className="h-3 w-3" />Approved</span>
    default:
      return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{status}</span>
  }
}

export default async function MigrationHubPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
        <div className="flex items-start justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
                <ArrowRightLeft className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-slate-900">Smart Data Migration</h1>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Migrate from Xero, MYOB, or QuickBooks with full data integrity. Our migration engine preserves
              your chart of accounts structure, maps entities intelligently, and provides a full audit trail of
              every change. Rollback is available for 30 days after completion.
            </p>
          </div>
          <Link
            href="/migration/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Migration
          </Link>
        </div>

        {/* Key Principles */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-xl bg-white/70 p-4 backdrop-blur-sm">
            <Shield className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Data Preserved</p>
              <p className="text-xs text-slate-500">Your legacy data is preserved until you confirm</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-white/70 p-4 backdrop-blur-sm">
            <ScrollText className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Full Audit Trail</p>
              <p className="text-xs text-slate-500">Every change is logged with entity info and timestamp</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-white/70 p-4 backdrop-blur-sm">
            <RotateCcw className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Rollback Available</p>
              <p className="text-xs text-slate-500">Rollback available for 30 days after completion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Source System Cards */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Source Systems</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sourceCards.map((source) => (
            <Link
              key={source.name}
              href={`/migration/new?source=${source.name.toLowerCase()}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${source.bgClass}`}>
                  <span className={`text-sm font-bold ${source.textClass}`}>{source.abbr}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{source.name}</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{source.description}</p>
              <div className="mt-3">
                <span className="text-xs font-medium text-indigo-600 group-hover:text-indigo-700">
                  Start Migration &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Active Migrations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Active Migrations</h2>
          <span className="text-xs font-medium text-slate-500">{activeMigrations.length} in progress</span>
        </div>
        {activeMigrations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">No active migrations. Start a new one above.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Migration</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Source</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Progress</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Records</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Updated</th>
                  <th className="px-4 py-3 font-semibold text-slate-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeMigrations.map((mig) => (
                  <tr key={mig.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{mig.name}</p>
                      <p className="text-xs text-slate-400">{mig.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{mig.source}</td>
                    <td className="px-4 py-3">{statusBadge(mig.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${mig.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600">{mig.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600">
                        {mig.importedRecords.toLocaleString()} / {mig.totalRecords.toLocaleString()}
                      </span>
                      {mig.failedRecords > 0 && (
                        <span className="ml-1 text-xs text-red-500">({mig.failedRecords} failed)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(mig.updatedAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/migration/${mig.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Completed Migrations */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Completed Migrations</h2>
        {completedMigrations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">No completed migrations yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedMigrations.map((mig) => (
              <div
                key={mig.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{mig.name}</p>
                    <p className="text-xs text-slate-500">
                      {mig.source} &middot; {mig.importedRecords.toLocaleString()} records imported &middot;
                      Completed{" "}
                      {new Date(mig.completedAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      Rollback until{" "}
                      {new Date(mig.rollbackDeadline).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  {statusBadge(mig.status)}
                  <Link
                    href={`/migration/${mig.id}`}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
