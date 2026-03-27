"use client"

import { useState } from "react"
import { use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Clock,
  RotateCcw,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MigrationStepper } from "@/components/migration/migration-stepper"

const reconciliationChecklist = [
  { entityType: "Accounts", sourceTotal: 145, importedTotal: 143, status: "Variance" as const, reviewed: false },
  { entityType: "Contacts", sourceTotal: 890, importedTotal: 890, status: "Matched" as const, reviewed: true },
  { entityType: "Invoices", sourceTotal: 3420, importedTotal: 3418, status: "Variance" as const, reviewed: false },
  { entityType: "Bills", sourceTotal: 1250, importedTotal: 1250, status: "Matched" as const, reviewed: true },
  { entityType: "Bank Transactions", sourceTotal: 6520, importedTotal: 6520, status: "Matched" as const, reviewed: true },
  { entityType: "Journal Entries", sourceTotal: 225, importedTotal: 225, status: "Matched" as const, reviewed: true },
]

const warnings = [
  { type: "error", message: "12 records failed to import due to missing required fields", entityType: "Invoices" },
  { type: "warning", message: "2 account codes in Xero do not have equivalents - mapped to default accounts", entityType: "Accounts" },
  { type: "warning", message: "45 records had data type mismatches that were auto-corrected", entityType: "Various" },
]

export default function MigrationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [checklist, setChecklist] = useState(reconciliationChecklist)
  const [showRollbackDialog, setShowRollbackDialog] = useState(false)
  const [rollbackConfirmText, setRollbackConfirmText] = useState("")
  const [isApproving, setIsApproving] = useState(false)

  const allReviewed = checklist.every((c) => c.reviewed)
  const totalSource = checklist.reduce((sum, c) => sum + c.sourceTotal, 0)
  const totalImported = checklist.reduce((sum, c) => sum + c.importedTotal, 0)
  const rollbackDeadline = "9 April 2026"

  const handleMarkReviewed = (entityType: string) => {
    setChecklist((prev) =>
      prev.map((c) => (c.entityType === entityType ? { ...c, reviewed: true } : c))
    )
  }

  const handleApprove = async () => {
    setIsApproving(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsApproving(false)
    // Would redirect on success
  }

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
          <h1 className="text-2xl font-semibold text-slate-900">Review & Approve Migration</h1>
          <p className="text-sm text-slate-500">Xero FY2025 Full Migration &middot; mig-001</p>
        </div>
      </div>

      <MigrationStepper currentStep="Reconcile" />

      {/* Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Import Summary</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Total Source Records</p>
            <p className="text-xl font-bold text-slate-900">{totalSource.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Successfully Imported</p>
            <p className="text-xl font-bold text-green-600">{totalImported.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Failed</p>
            <p className="text-xl font-bold text-red-600">12</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Skipped</p>
            <p className="text-xl font-bold text-slate-500">120</p>
          </div>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <span className="text-xs font-bold text-blue-600">X</span>
            </div>
            <h4 className="text-sm font-semibold text-blue-900">Source System (Xero)</h4>
          </div>
          <div className="space-y-2">
            {checklist.map((c) => (
              <div key={c.entityType} className="flex items-center justify-between text-sm">
                <span className="text-blue-700">{c.entityType}</span>
                <span className="font-medium text-blue-900">{c.sourceTotal.toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-blue-200 pt-2 flex items-center justify-between text-sm font-semibold">
              <span className="text-blue-900">Total</span>
              <span className="text-blue-900">{totalSource.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <Shield className="h-4 w-4 text-indigo-600" />
            </div>
            <h4 className="text-sm font-semibold text-indigo-900">This System</h4>
          </div>
          <div className="space-y-2">
            {checklist.map((c) => (
              <div key={c.entityType} className="flex items-center justify-between text-sm">
                <span className="text-indigo-700">{c.entityType}</span>
                <span className={cn("font-medium", c.importedTotal === c.sourceTotal ? "text-indigo-900" : "text-amber-600")}>
                  {c.importedTotal.toLocaleString()}
                </span>
              </div>
            ))}
            <div className="border-t border-indigo-200 pt-2 flex items-center justify-between text-sm font-semibold">
              <span className="text-indigo-900">Total</span>
              <span className="text-indigo-900">{totalImported.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reconciliation Checklist */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Reconciliation Checklist</h3>
        <p className="text-xs text-slate-500 mb-4">
          All entity types must show &quot;Matched&quot; or be marked as &quot;Reviewed&quot; before approval
        </p>
        <div className="space-y-2">
          {checklist.map((c) => (
            <div
              key={c.entityType}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 transition-colors",
                c.reviewed ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"
              )}
            >
              <div className="flex items-center gap-3">
                {c.reviewed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : c.status === "Matched" ? (
                  <CheckCircle2 className="h-5 w-5 text-slate-300" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900">{c.entityType}</p>
                  <p className="text-xs text-slate-500">
                    {c.sourceTotal} source &rarr; {c.importedTotal} imported
                    {c.sourceTotal !== c.importedTotal && (
                      <span className="text-amber-600 ml-1">
                        (variance: {c.sourceTotal - c.importedTotal})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.status === "Matched" ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Matched
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    Variance
                  </span>
                )}
                {!c.reviewed && (
                  <button
                    type="button"
                    onClick={() => handleMarkReviewed(c.entityType)}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    Mark Reviewed
                  </button>
                )}
                {c.reviewed && (
                  <span className="text-xs font-medium text-green-600">Reviewed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-sm font-semibold text-amber-900 mb-3">Warnings & Issues</h3>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2">
                {w.type === "error" ? (
                  <XCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                )}
                <div>
                  <p className={cn("text-sm", w.type === "error" ? "text-red-800" : "text-amber-800")}>
                    {w.message}
                  </p>
                  <p className="text-xs text-amber-600">Entity: {w.entityType}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rollback Notice */}
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 p-4">
        <Clock className="h-4 w-4 text-slate-500" />
        <p className="text-sm text-slate-600">
          You can rollback this migration until <span className="font-semibold text-slate-900">{rollbackDeadline}</span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => setShowRollbackDialog(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reject & Rollback
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={!allReviewed || isApproving}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApproving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Approve & Complete Migration
            </>
          )}
        </button>
      </div>
      {!allReviewed && (
        <p className="text-xs text-amber-600 text-right">
          All reconciliation items must be reviewed before approval
        </p>
      )}

      {/* Rollback Confirmation Dialog */}
      {showRollbackDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <RotateCcw className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Reject & Rollback Migration</h3>
                <p className="text-sm text-slate-500">This action cannot be easily undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              This will remove all imported records from this migration and restore the system to its
              pre-migration state. Source data files will be preserved.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700">
                Type <span className="font-mono text-red-600">ROLLBACK</span> to confirm:
              </label>
              <input
                type="text"
                value={rollbackConfirmText}
                onChange={(e) => setRollbackConfirmText(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="ROLLBACK"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRollbackDialog(false)
                  setRollbackConfirmText("")
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rollbackConfirmText !== "ROLLBACK"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
