"use client"

import { useState } from "react"
import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Filter, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const ENTITY_TYPES = [
  "Accounts",
  "Contacts",
  "Invoices",
  "Bills",
  "Bank Transactions",
  "Journal Entries",
]

const mockComparisonData: Record<string, Array<{
  sourceId: string
  source: Record<string, string>
  target: Record<string, string> | null
  differences: string[]
}>> = {
  Accounts: [
    {
      sourceId: "ACC-001",
      source: { Name: "Sales Revenue", Code: "200", Type: "REVENUE", TaxType: "GST on Income" },
      target: { Name: "Sales Revenue", Code: "4-1000", Type: "Revenue", TaxType: "GST" },
      differences: ["Code", "Type", "TaxType"],
    },
    {
      sourceId: "ACC-002",
      source: { Name: "Cost of Goods Sold", Code: "310", Type: "DIRECTCOSTS", TaxType: "GST on Expenses" },
      target: { Name: "Cost of Goods Sold", Code: "5-1000", Type: "COGS", TaxType: "GST" },
      differences: ["Code", "Type", "TaxType"],
    },
    {
      sourceId: "ACC-003",
      source: { Name: "Office Supplies", Code: "429", Type: "EXPENSE", TaxType: "GST on Expenses" },
      target: null,
      differences: [],
    },
    {
      sourceId: "ACC-004",
      source: { Name: "Bank Account", Code: "090", Type: "BANK", TaxType: "None" },
      target: { Name: "Bank Account", Code: "1-1100", Type: "Bank", TaxType: "None" },
      differences: ["Code", "Type"],
    },
  ],
  Contacts: [
    {
      sourceId: "CON-001",
      source: { Name: "Acme Corporation", Email: "billing@acme.com", Phone: "02 9999 1234", Type: "Customer" },
      target: { Name: "Acme Corp Pty Ltd", Email: "billing@acme.com", Phone: "02 9999 1234", Type: "Customer" },
      differences: ["Name"],
    },
    {
      sourceId: "CON-002",
      source: { Name: "Smith & Co", Email: "ap@smithco.com.au", Phone: "03 8888 5678", Type: "Supplier" },
      target: null,
      differences: [],
    },
    {
      sourceId: "CON-003",
      source: { Name: "Global Tech Ltd", Email: "finance@globaltech.com", Phone: "+61 7 7777 9012", Type: "Customer" },
      target: { Name: "Global Tech Ltd", Email: "finance@globaltech.com", Phone: "+61 7 7777 9012", Type: "Customer" },
      differences: [],
    },
  ],
}

type FilterMode = "all" | "differences" | "missing"

export default function MigrationComparePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [selectedEntity, setSelectedEntity] = useState("Accounts")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")

  const data = mockComparisonData[selectedEntity] || []

  const filteredData = data.filter((item) => {
    if (filterMode === "differences") return item.differences.length > 0 && item.target !== null
    if (filterMode === "missing") return item.target === null
    return true
  })

  const fields = data.length > 0 ? Object.keys(data[0].source) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/migration/${id}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Data Comparison</h1>
          <p className="text-sm text-slate-500">
            Side-by-side comparison of source and target records
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Entity Type:</label>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            {ENTITY_TYPES.map((et) => (
              <option key={et} value={et}>{et}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            {([
              { value: "all", label: "Show All", icon: Eye },
              { value: "differences", label: "Differences Only", icon: AlertTriangle },
              { value: "missing", label: "Missing Only", icon: EyeOff },
            ] as const).map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilterMode(f.value)}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                  filterMode === f.value
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <f.icon className="h-3 w-3" />
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Records</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{data.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">With Differences</p>
          <p className="mt-1 text-xl font-bold text-amber-600">
            {data.filter((d) => d.differences.length > 0 && d.target).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Missing in Target</p>
          <p className="mt-1 text-xl font-bold text-red-600">
            {data.filter((d) => !d.target).length}
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      {filteredData.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">No records match the current filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredData.map((item) => (
            <div
              key={item.sourceId}
              className={cn(
                "rounded-xl border bg-white shadow-sm overflow-hidden",
                !item.target ? "border-red-200" : item.differences.length > 0 ? "border-amber-200" : "border-slate-200"
              )}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{item.sourceId}</span>
                  <span className="text-sm text-slate-600">{item.source.Name || item.source[fields[0]]}</span>
                </div>
                {!item.target ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    Missing in Target
                  </span>
                ) : item.differences.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    {item.differences.length} difference{item.differences.length !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Matched
                  </span>
                )}
              </div>

              <div className="grid grid-cols-[1fr_1fr_1fr] text-sm">
                {/* Header row */}
                <div className="px-4 py-2 bg-slate-50 font-semibold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  Field
                </div>
                <div className="px-4 py-2 bg-blue-50 font-semibold text-xs uppercase tracking-wider text-blue-600 border-b border-blue-100">
                  Source (Xero)
                </div>
                <div className="px-4 py-2 bg-indigo-50 font-semibold text-xs uppercase tracking-wider text-indigo-600 border-b border-indigo-100">
                  Target (This System)
                </div>

                {fields.map((field) => {
                  const isDiff = item.differences.includes(field)
                  return (
                    <div key={field} className="contents">
                      <div className={cn("px-4 py-2 font-medium text-slate-700 border-b border-slate-50", isDiff && "bg-amber-50/50")}>
                        {field}
                      </div>
                      <div className={cn("px-4 py-2 border-b border-slate-50", isDiff ? "bg-red-50 text-red-700 font-medium" : "text-slate-600")}>
                        {item.source[field]}
                      </div>
                      <div className={cn("px-4 py-2 border-b border-slate-50", !item.target ? "text-slate-300 italic" : isDiff ? "bg-green-50 text-green-700 font-medium" : "text-slate-600")}>
                        {item.target ? item.target[field] : "N/A"}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
