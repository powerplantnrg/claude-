"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SOURCE_SYSTEMS = [
  {
    id: "xero",
    name: "Xero",
    abbr: "X",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600",
    borderActive: "border-blue-500 ring-blue-200",
    description: "Full chart of accounts, invoices, bills, contacts, bank transactions, and fixed assets.",
    instructions: [
      "Log in to your Xero account",
      "Go to Settings > Export Data",
      "Select All entity types",
      "Choose date range (or All Dates for full migration)",
      "Click Export as CSV",
      "Download the ZIP file containing all CSVs",
      "Upload the individual CSV files in the next step",
    ],
  },
  {
    id: "myob",
    name: "MYOB",
    abbr: "M",
    bgClass: "bg-purple-100",
    textClass: "text-purple-600",
    borderActive: "border-purple-500 ring-purple-200",
    description: "Chart of accounts, contacts, invoices, payroll data, and inventory items.",
    instructions: [
      "Open your MYOB company file",
      "Go to File > Export Data > All Data",
      "Select Tab-delimited or CSV format",
      "Choose your date range",
      "Export each entity type separately",
      "Save all exported files to a folder",
      "Upload the individual files in the next step",
    ],
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    abbr: "QB",
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-600",
    borderActive: "border-emerald-500 ring-emerald-200",
    description: "Accounts, customers, vendors, invoices, expenses, and bank transactions.",
    instructions: [
      "Log in to QuickBooks Online",
      "Go to Settings (gear icon) > Export Data",
      "Select the data types you want to export",
      "Choose the date range",
      "Click Export to Excel/CSV",
      "Download each report as CSV",
      "Upload the individual CSV files in the next step",
    ],
  },
  {
    id: "csv",
    name: "CSV Import",
    abbr: "CSV",
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
    borderActive: "border-slate-500 ring-slate-200",
    description: "Import from any system using standard CSV files. Map columns manually.",
    instructions: [
      "Prepare your CSV files with headers in the first row",
      "Ensure each entity type is in a separate file (accounts.csv, contacts.csv, etc.)",
      "Use UTF-8 encoding for special characters",
      "Date formats should be DD/MM/YYYY or YYYY-MM-DD",
      "Currency amounts should be plain numbers (no currency symbols)",
      "Upload each file in the next step",
    ],
  },
]

export default function NewMigrationPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [migrationName, setMigrationName] = useState("")
  const [migrationNotes, setMigrationNotes] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const sourceSystem = SOURCE_SYSTEMS.find((s) => s.id === selectedSource)

  const canProceed = () => {
    if (step === 1) return !!selectedSource
    if (step === 2) return migrationName.trim().length > 0
    if (step === 3) return true
    return false
  }

  const handleCreate = async () => {
    setIsCreating(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    // Navigate to the new migration detail page
    router.push("/migration/mig-new")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/migration"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">New Migration</h1>
          <p className="text-sm text-slate-500">Set up a new data migration in 3 steps</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                s < step && "bg-green-500 text-white",
                s === step && "bg-indigo-600 text-white",
                s > step && "bg-slate-100 text-slate-400"
              )}
            >
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                s === step ? "text-indigo-600" : s < step ? "text-green-600" : "text-slate-400"
              )}
            >
              {s === 1 ? "Select Source" : s === 2 ? "Name & Notes" : "Export Instructions"}
            </span>
            {s < 3 && <div className="mx-2 h-px w-8 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Step 1: Select Source */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Select Source System</h2>
              <p className="text-sm text-slate-500">Choose the accounting system you are migrating from</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {SOURCE_SYSTEMS.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setSelectedSource(source.id)}
                  className={cn(
                    "rounded-xl border-2 p-5 text-left transition-all",
                    selectedSource === source.id
                      ? `${source.borderActive} ring-2 bg-white`
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${source.bgClass}`}>
                      <span className={`text-sm font-bold ${source.textClass}`}>{source.abbr}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{source.name}</h3>
                    {selectedSource === source.id && (
                      <CheckCircle2 className="ml-auto h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{source.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Name & Notes */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Name Your Migration</h2>
              <p className="text-sm text-slate-500">Give this migration a descriptive name and add any notes</p>
            </div>
            <div className="space-y-4 max-w-lg">
              <div>
                <label htmlFor="migration-name" className="block text-sm font-medium text-slate-700 mb-1">
                  Migration Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="migration-name"
                  type="text"
                  value={migrationName}
                  onChange={(e) => setMigrationName(e.target.value)}
                  placeholder={`e.g. ${sourceSystem?.name ?? "System"} FY2026 Full Migration`}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="migration-notes" className="block text-sm font-medium text-slate-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id="migration-notes"
                  value={migrationNotes}
                  onChange={(e) => setMigrationNotes(e.target.value)}
                  placeholder="Any additional context about this migration..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-700">Migration Summary</p>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <p>Source: <span className="font-medium text-slate-700">{sourceSystem?.name}</span></p>
                  <p>Name: <span className="font-medium text-slate-700">{migrationName || "..."}</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Export Instructions */}
        {step === 3 && sourceSystem && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Export Data from {sourceSystem.name}
              </h2>
              <p className="text-sm text-slate-500">
                Follow these steps to export your data, then upload the files after creating this migration job
              </p>
            </div>
            <div className="max-w-lg">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${sourceSystem.bgClass}`}>
                    <span className={`text-xs font-bold ${sourceSystem.textClass}`}>{sourceSystem.abbr}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{sourceSystem.name} Export Steps</h3>
                </div>
                <ol className="space-y-3">
                  {sourceSystem.instructions.map((instruction, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-700 pt-0.5">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs font-semibold text-amber-800">Tip</p>
                <p className="text-xs text-amber-700 mt-1">
                  Export all data types even if you only plan to import some. Having the full dataset helps
                  with reconciliation and catching discrepancies.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Create Migration Job
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
