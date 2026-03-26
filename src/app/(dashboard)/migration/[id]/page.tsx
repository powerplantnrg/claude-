"use client"

import { useState } from "react"
import { use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Layers,
  ListChecks,
  Settings2,
  BarChart3,
  ScrollText,
  FileText,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  SkipForward,
  Eye,
  Printer,
  ToggleLeft,
  ToggleRight,
  Plus,
  Filter,
  ArrowUpDown,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MigrationStepper } from "@/components/migration/migration-stepper"
import { FileUploadZone } from "@/components/migration/file-upload-zone"
import { MappingReviewCard } from "@/components/migration/mapping-review-card"
import type { MigrationStep } from "@/components/migration/migration-stepper"

// Mock data
const migrationJob = {
  id: "mig-001",
  name: "Xero FY2025 Full Migration",
  source: "Xero",
  status: "Import" as MigrationStep,
  createdAt: "2026-03-24T10:30:00Z",
  updatedAt: "2026-03-26T08:15:00Z",
  createdBy: "admin@company.com",
  notes: "Full migration of all FY2025 data from Xero including historical transactions.",
  stats: {
    total: 12450,
    imported: 8466,
    failed: 12,
    warning: 45,
    skipped: 120,
  },
}

const ENTITY_TYPES = [
  "Accounts",
  "Contacts",
  "Invoices",
  "Bills",
  "Bank Transactions",
  "Payroll",
  "Fixed Assets",
  "Inventory",
  "Journal Entries",
]

const mockMappings = [
  { sourceId: "ACC-001", sourceName: "Sales Revenue", target: "4-1000 Revenue", entityType: "Accounts", status: "mapped" as const, needsReview: false },
  { sourceId: "ACC-002", sourceName: "Cost of Goods Sold", target: "5-1000 COGS", entityType: "Accounts", status: "mapped" as const, needsReview: false },
  { sourceId: "ACC-003", sourceName: "Office Supplies", target: "", entityType: "Accounts", status: "unmapped" as const, needsReview: true },
  { sourceId: "CON-001", sourceName: "Acme Corporation", target: "Acme Corp Pty Ltd", entityType: "Contacts", status: "mapped" as const, needsReview: true },
  { sourceId: "CON-002", sourceName: "Smith & Co", target: "", entityType: "Contacts", status: "unmapped" as const, needsReview: true },
  { sourceId: "INV-001", sourceName: "Invoice #1234", target: "INV-2026-0045", entityType: "Invoices", status: "mapped" as const, needsReview: false },
  { sourceId: "INV-002", sourceName: "Invoice #1235", target: "INV-2026-0046", entityType: "Invoices", status: "review" as const, needsReview: true },
]

const mockRules = [
  { id: "r1", entityType: "Accounts", sourceField: "Account Type", sourceValue: "REVENUE", targetField: "Type", targetValue: "Revenue", ruleType: "Value Map", active: true, priority: 1 },
  { id: "r2", entityType: "Accounts", sourceField: "Tax Type", sourceValue: "GST on Income", targetField: "Tax Code", targetValue: "GST", ruleType: "Value Map", active: true, priority: 2 },
  { id: "r3", entityType: "Contacts", sourceField: "Is Supplier", sourceValue: "true", targetField: "Contact Type", targetValue: "Vendor", ruleType: "Conditional", active: false, priority: 3 },
]

const mockReconciliation = [
  { entityType: "Accounts", sourceTotal: 145, importedTotal: 143, variance: 2, status: "Variance" as const },
  { entityType: "Contacts", sourceTotal: 890, importedTotal: 890, variance: 0, status: "Matched" as const },
  { entityType: "Invoices", sourceTotal: 3420, importedTotal: 3418, variance: 2, status: "Variance" as const },
  { entityType: "Bills", sourceTotal: 1250, importedTotal: 1250, variance: 0, status: "Matched" as const },
  { entityType: "Bank Transactions", sourceTotal: 6520, importedTotal: 6520, variance: 0, status: "Matched" as const },
  { entityType: "Journal Entries", sourceTotal: 225, importedTotal: 225, variance: 0, status: "Matched" as const },
]

const mockAuditLog = [
  { id: "a1", action: "Migration Created", entity: "Migration mig-001", user: "admin@company.com", timestamp: "2026-03-24T10:30:00Z", details: "Created migration job from Xero" },
  { id: "a2", action: "Files Uploaded", entity: "Accounts (145 records)", user: "admin@company.com", timestamp: "2026-03-24T10:35:00Z", details: "Uploaded accounts.csv" },
  { id: "a3", action: "Files Uploaded", entity: "Contacts (890 records)", user: "admin@company.com", timestamp: "2026-03-24T10:36:00Z", details: "Uploaded contacts.csv" },
  { id: "a4", action: "Transform Started", entity: "All entities", user: "system", timestamp: "2026-03-24T10:40:00Z", details: "Auto-mapping initiated" },
  { id: "a5", action: "Mapping Reviewed", entity: "ACC-003 Office Supplies", user: "admin@company.com", timestamp: "2026-03-25T09:15:00Z", details: "Manually mapped to 6-2000 Office" },
  { id: "a6", action: "Import Started", entity: "All entities", user: "admin@company.com", timestamp: "2026-03-25T14:00:00Z", details: "Import phase started" },
  { id: "a7", action: "Import Progress", entity: "8,466 / 12,450 records", user: "system", timestamp: "2026-03-26T08:15:00Z", details: "68% complete" },
]

const TABS = [
  { key: "overview", label: "Overview", icon: Layers },
  { key: "upload", label: "Upload", icon: Upload },
  { key: "mappings", label: "Mappings", icon: ListChecks },
  { key: "rules", label: "Rules", icon: Settings2 },
  { key: "reconciliation", label: "Reconciliation", icon: BarChart3 },
  { key: "audit", label: "Audit Log", icon: ScrollText },
  { key: "report", label: "Report", icon: FileText },
]

export default function MigrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = useState("overview")
  const [mappingFilter, setMappingFilter] = useState("all")
  const [mappingEntityFilter, setMappingEntityFilter] = useState("all")
  const [expandedMapping, setExpandedMapping] = useState<string | null>(null)
  const [auditFilter, setAuditFilter] = useState("all")
  const [selectedMappings, setSelectedMappings] = useState<string[]>([])

  const filteredMappings = mockMappings.filter((m) => {
    if (mappingEntityFilter !== "all" && m.entityType !== mappingEntityFilter) return false
    if (mappingFilter === "needs-review" && !m.needsReview) return false
    if (mappingFilter === "unmapped" && m.status !== "unmapped") return false
    if (mappingFilter === "mapped" && m.status !== "mapped") return false
    return true
  })

  const filteredAuditLog = mockAuditLog.filter((a) => {
    if (auditFilter === "all") return true
    return a.action.toLowerCase().includes(auditFilter.toLowerCase())
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/migration"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{migrationJob.name}</h1>
            <p className="text-sm text-slate-500">
              {migrationJob.source} &middot; {migrationJob.id} &middot; Created{" "}
              {new Date(migrationJob.createdAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/migration/${id}/compare`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" />
            Compare
          </Link>
          <Link
            href={`/migration/${id}/review`}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            Review & Approve
          </Link>
        </div>
      </div>

      {/* Stepper */}
      <MigrationStepper currentStep={migrationJob.status} />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.key
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                { label: "Total", value: migrationJob.stats.total.toLocaleString(), color: "text-slate-900" },
                { label: "Imported", value: migrationJob.stats.imported.toLocaleString(), color: "text-green-600" },
                { label: "Failed", value: migrationJob.stats.failed.toLocaleString(), color: "text-red-600" },
                { label: "Warnings", value: migrationJob.stats.warning.toLocaleString(), color: "text-amber-600" },
                { label: "Skipped", value: migrationJob.stats.skipped.toLocaleString(), color: "text-slate-500" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{stat.label}</p>
                  <p className={cn("mt-1 text-2xl font-bold", stat.color)}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Job Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Migration Details</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-slate-500">Source System:</span>{" "}
                  <span className="font-medium text-slate-900">{migrationJob.source}</span>
                </div>
                <div>
                  <span className="text-slate-500">Created By:</span>{" "}
                  <span className="font-medium text-slate-900">{migrationJob.createdBy}</span>
                </div>
                <div>
                  <span className="text-slate-500">Current Status:</span>{" "}
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{migrationJob.status}</span>
                </div>
                <div>
                  <span className="text-slate-500">Last Updated:</span>{" "}
                  <span className="font-medium text-slate-900">
                    {new Date(migrationJob.updatedAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              {migrationJob.notes && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Notes</p>
                  <p className="text-sm text-slate-600 mt-1">{migrationJob.notes}</p>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Import Progress</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {migrationJob.stats.imported.toLocaleString()} of {migrationJob.stats.total.toLocaleString()} records
                  </span>
                  <span className="font-medium text-slate-900">
                    {Math.round((migrationJob.stats.imported / migrationJob.stats.total) * 100)}%
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${(migrationJob.stats.imported / migrationJob.stats.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
              >
                <Play className="h-4 w-4" />
                Resume Import
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Pause className="h-4 w-4" />
                Pause
              </button>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Upload Data Files</h3>
              <p className="text-sm text-slate-500">Upload CSV or Excel files for each entity type</p>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {ENTITY_TYPES.map((entity) => (
                <div key={entity} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <FileUploadZone
                    entityType={entity}
                    status={
                      ["Accounts", "Contacts", "Invoices", "Bills", "Bank Transactions", "Journal Entries"].includes(entity)
                        ? "success"
                        : "idle"
                    }
                    recordCount={
                      entity === "Accounts" ? 145 :
                      entity === "Contacts" ? 890 :
                      entity === "Invoices" ? 3420 :
                      entity === "Bills" ? 1250 :
                      entity === "Bank Transactions" ? 6520 :
                      entity === "Journal Entries" ? 225 :
                      undefined
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mappings Tab */}
        {activeTab === "mappings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Field Mappings</h3>
                <p className="text-sm text-slate-500">Review and adjust how source records map to target entities</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedMappings.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Approve Selected ({selectedMappings.length})
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <SkipForward className="h-3 w-3" />
                      Skip Selected
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={mappingEntityFilter}
                  onChange={(e) => setMappingEntityFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">All Entity Types</option>
                  {["Accounts", "Contacts", "Invoices"].map((et) => (
                    <option key={et} value={et}>{et}</option>
                  ))}
                </select>
              </div>
              <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
                {[
                  { value: "all", label: "All" },
                  { value: "needs-review", label: "Needs Review" },
                  { value: "unmapped", label: "Unmapped" },
                  { value: "mapped", label: "Mapped" },
                ].map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setMappingFilter(f.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors",
                      mappingFilter === f.value
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mapping list */}
            <div className="space-y-2">
              {filteredMappings.map((mapping) => (
                <div key={mapping.sourceId} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedMappings.includes(mapping.sourceId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMappings([...selectedMappings, mapping.sourceId])
                      } else {
                        setSelectedMappings(selectedMappings.filter((id) => id !== mapping.sourceId))
                      }
                    }}
                    className="mt-4 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <MappingReviewCard
                      sourceId={mapping.sourceId}
                      sourceName={mapping.sourceName}
                      targetName={mapping.target || undefined}
                      entityType={mapping.entityType}
                      status={mapping.status}
                      expanded={expandedMapping === mapping.sourceId}
                      onToggle={() =>
                        setExpandedMapping(expandedMapping === mapping.sourceId ? null : mapping.sourceId)
                      }
                      diffs={[
                        { field: "Name", sourceValue: mapping.sourceName, targetValue: mapping.target || "N/A", isDifferent: mapping.sourceName !== mapping.target },
                        { field: "Type", sourceValue: mapping.entityType, targetValue: mapping.entityType, isDifferent: false },
                      ]}
                    />
                    {mapping.status === "unmapped" && expandedMapping === mapping.sourceId && (
                      <div className="mt-2 ml-11">
                        <label className="text-xs font-medium text-slate-700">Assign Target:</label>
                        <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none">
                          <option value="">Select target...</option>
                          <option value="6-2000">6-2000 Office Expenses</option>
                          <option value="6-2100">6-2100 General Supplies</option>
                          <option value="6-3000">6-3000 Operating Expenses</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === "rules" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Transformation Rules</h3>
                <p className="text-sm text-slate-500">Define rules to automatically transform source data during migration</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Rule
              </button>
            </div>

            {/* Rules list */}
            <div className="space-y-3">
              {mockRules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "rounded-xl border bg-white p-4 shadow-sm transition-all",
                    rule.active ? "border-slate-200" : "border-slate-200 opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                        {rule.priority}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {rule.entityType}: {rule.sourceField} = &quot;{rule.sourceValue}&quot;
                          <ArrowRight className="inline h-3 w-3 mx-1.5 text-slate-400" />
                          {rule.targetField} = &quot;{rule.targetValue}&quot;
                        </p>
                        <p className="text-xs text-slate-500">Type: {rule.ruleType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        title={rule.active ? "Disable rule" : "Enable rule"}
                      >
                        {rule.active ? (
                          <ToggleRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Rule Form */}
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Add New Rule</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Entity Type</label>
                  <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                    <option value="">Select...</option>
                    {ENTITY_TYPES.map((et) => (
                      <option key={et} value={et}>{et}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Source Field / Value</label>
                  <input
                    type="text"
                    placeholder="e.g. Account Type = REVENUE"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Target Field / Value</label>
                  <input
                    type="text"
                    placeholder="e.g. Type = Revenue"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Rule Type</label>
                  <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                    <option value="value-map">Value Map</option>
                    <option value="conditional">Conditional</option>
                    <option value="transform">Transform</option>
                    <option value="default">Default Value</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Rule
              </button>
            </div>
          </div>
        )}

        {/* Reconciliation Tab */}
        {activeTab === "reconciliation" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Reconciliation Results</h3>
              <p className="text-sm text-slate-500">Compare source totals with imported totals by entity type</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 font-semibold text-slate-600">Entity Type</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Source Total</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Imported Total</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Variance</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockReconciliation.map((rec) => (
                    <tr key={rec.entityType} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{rec.entityType}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{rec.sourceTotal.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{rec.importedTotal.toLocaleString()}</td>
                      <td className={cn("px-4 py-3 text-right font-medium", rec.variance > 0 ? "text-amber-600" : "text-green-600")}>
                        {rec.variance}
                      </td>
                      <td className="px-4 py-3">
                        {rec.status === "Matched" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Matched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            Variance
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {rec.status === "Matched" ? "Reviewed" : "Mark as Reviewed"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Audit Trail</h3>
                <p className="text-sm text-slate-500">Chronological log of all migration actions</p>
              </div>
              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">All Actions</option>
                <option value="created">Created</option>
                <option value="uploaded">Uploaded</option>
                <option value="transform">Transform</option>
                <option value="mapping">Mapping</option>
                <option value="import">Import</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredAuditLog.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <ScrollText className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {log.action}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{log.entity}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{log.details}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-slate-600">{log.user}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(log.timestamp).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Tab */}
        {activeTab === "report" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Migration Report</h3>
                <p className="text-sm text-slate-500">Full summary of the migration job</p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Print Report
              </button>
            </div>

            {/* Summary Stats */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Summary Statistics</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Total Records</p>
                  <p className="text-xl font-bold text-slate-900">{migrationJob.stats.total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Successfully Imported</p>
                  <p className="text-xl font-bold text-green-600">{migrationJob.stats.imported.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Failed</p>
                  <p className="text-xl font-bold text-red-600">{migrationJob.stats.failed.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Success Rate</p>
                  <p className="text-xl font-bold text-slate-900">
                    {((migrationJob.stats.imported / migrationJob.stats.total) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Entity Breakdown */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Entity Breakdown</h4>
              <div className="space-y-3">
                {mockReconciliation.map((rec) => (
                  <div key={rec.entityType} className="flex items-center gap-3">
                    <span className="w-36 text-sm text-slate-600">{rec.entityType}</span>
                    <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-4 rounded-full bg-indigo-500"
                        style={{ width: `${(rec.importedTotal / rec.sourceTotal) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 w-24 text-right">
                      {rec.importedTotal} / {rec.sourceTotal}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reconciliation Overview */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Reconciliation Overview</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-green-50">
                  <p className="text-2xl font-bold text-green-600">
                    {mockReconciliation.filter((r) => r.status === "Matched").length}
                  </p>
                  <p className="text-xs text-green-700">Matched</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-50">
                  <p className="text-2xl font-bold text-amber-600">
                    {mockReconciliation.filter((r) => r.status === "Variance").length}
                  </p>
                  <p className="text-xs text-amber-700">Variance</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-50">
                  <p className="text-2xl font-bold text-slate-600">{mockReconciliation.length}</p>
                  <p className="text-xs text-slate-500">Total Types</p>
                </div>
              </div>
            </div>

            {/* Issues & Warnings */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Issues & Warnings</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3">
                  <XCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">12 records failed to import</p>
                    <p className="text-xs text-red-600">Missing required fields in source data</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">45 records imported with warnings</p>
                    <p className="text-xs text-amber-600">Data type mismatches auto-corrected</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">2 entity types have variances</p>
                    <p className="text-xs text-amber-600">Accounts and Invoices need reconciliation review</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
