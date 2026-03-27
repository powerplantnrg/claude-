"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CalendarCheck,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Undo2,
  Lock,
  FileText,
  Loader2,
} from "lucide-react"

interface YearEndClose {
  id: string
  financialYear: number
  closeDate: string
  status: "InProgress" | "Completed" | "Reversed"
  notes: string | null
  closedBy: { id: string; name: string; email: string } | null
  retainedEarningsEntry: { id: string; entryNumber: number; date: string; narration: string } | null
}

interface PnLSummary {
  revenue: { accountId: string; code: string; name: string; amount: number }[]
  totalRevenue: number
  expenses: { accountId: string; code: string; name: string; amount: number }[]
  totalExpenses: number
  netProfitLoss: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function YearEndPage() {
  const [closes, setCloses] = useState<YearEndClose[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [selectedFY, setSelectedFY] = useState<number | null>(null)
  const [pnlSummary, setPnlSummary] = useState<PnLSummary | null>(null)
  const [notes, setNotes] = useState("")
  const [loadingPnl, setLoadingPnl] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchCloses = useCallback(async () => {
    try {
      const res = await fetch("/api/year-end")
      if (!res.ok) throw new Error("Failed to fetch year-end closes")
      const data = await res.json()
      setCloses(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCloses()
  }, [fetchCloses])

  // Current FY calculation
  const now = new Date()
  const fyEnd = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()

  // Available FYs for closing (last 5 years)
  const availableFYs: number[] = []
  for (let y = fyEnd; y >= fyEnd - 4; y--) {
    const alreadyClosed = closes.some(
      (c) => c.financialYear === y && (c.status === "Completed" || c.status === "InProgress")
    )
    if (!alreadyClosed) {
      availableFYs.push(y)
    }
  }

  async function fetchPnLForFY(fy: number) {
    setLoadingPnl(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports?type=pnl&fy=${fy}`)
      if (!res.ok) throw new Error("Failed to fetch P&L summary")
      const data = await res.json()
      setPnlSummary({
        revenue: data.revenue || [],
        totalRevenue: data.totalRevenue || 0,
        expenses: data.expenses || [],
        totalExpenses: data.totalExpenses || 0,
        netProfitLoss: data.netProfitLoss || 0,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingPnl(false)
    }
  }

  function handleSelectFY(fy: number) {
    setSelectedFY(fy)
    fetchPnLForFY(fy)
  }

  async function handleCloseYear() {
    if (!selectedFY) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/year-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialYear: selectedFY, notes }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to close financial year")
      }

      setSuccess(`Financial year FY ${selectedFY - 1}/${selectedFY} has been closed successfully`)
      setWizardOpen(false)
      setWizardStep(1)
      setSelectedFY(null)
      setPnlSummary(null)
      setNotes("")
      await fetchCloses()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReverse(id: string, fy: number) {
    if (
      !confirm(
        `Are you sure you want to reverse the year-end close for FY ${fy - 1}/${fy}? This will unlock all periods and reverse the retained earnings journal entry.`
      )
    ) {
      return
    }

    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/year-end/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reverse" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to reverse year-end close")
      }

      setSuccess(`Year-end close for FY ${fy - 1}/${fy} has been reversed`)
      await fetchCloses()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle className="h-3 w-3" />
            Completed
          </span>
        )
      case "InProgress":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            <Loader2 className="h-3 w-3 animate-spin" />
            In Progress
          </span>
        )
      case "Reversed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            <Undo2 className="h-3 w-3" />
            Reversed
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Year-End Close</h1>
          <p className="mt-1 text-sm text-slate-500">
            Close financial years, create retained earnings entries, and lock periods
          </p>
        </div>
        <button
          onClick={() => {
            setWizardOpen(true)
            setWizardStep(1)
            setSelectedFY(null)
            setPnlSummary(null)
            setNotes("")
          }}
          disabled={availableFYs.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <CalendarCheck className="h-4 w-4" />
          Close Financial Year
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Wizard */}
      {wizardOpen && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Progress Steps */}
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      wizardStep >= step
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {step}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      wizardStep >= step ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {step === 1 ? "Select FY" : step === 2 ? "Preview JE" : "Confirm"}
                  </span>
                  {step < 3 && <ChevronRight className="h-4 w-4 text-slate-300" />}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Select FY and Review P&L */}
          {wizardStep === 1 && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Step 1: Select Financial Year
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Choose the financial year to close and review the P&L summary
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {availableFYs.map((fy) => (
                  <button
                    key={fy}
                    onClick={() => handleSelectFY(fy)}
                    className={`rounded-lg border p-3 text-center transition-colors ${
                      selectedFY === fy
                        ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                        : "border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      FY {fy - 1}/{fy}
                    </p>
                    <p className="text-xs text-slate-500">
                      Jul {fy - 1} - Jun {fy}
                    </p>
                  </button>
                ))}
              </div>

              {loadingPnl && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading P&L summary...
                </div>
              )}

              {pnlSummary && selectedFY && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">
                    P&L Summary for FY {selectedFY - 1}/{selectedFY}
                  </h4>

                  {/* Revenue */}
                  <div className="rounded-lg border border-slate-200">
                    <div className="bg-green-50 px-4 py-2">
                      <p className="text-xs font-semibold text-green-800">Revenue</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {pnlSummary.revenue.map((r) => (
                        <div key={r.code} className="flex justify-between px-4 py-2 text-sm">
                          <span className="text-slate-600">{r.code} - {r.name}</span>
                          <span className="font-mono text-slate-900">{formatCurrency(r.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between bg-green-50 px-4 py-2 text-sm font-semibold">
                        <span className="text-green-900">Total Revenue</span>
                        <span className="font-mono text-green-900">{formatCurrency(pnlSummary.totalRevenue)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="rounded-lg border border-slate-200">
                    <div className="bg-red-50 px-4 py-2">
                      <p className="text-xs font-semibold text-red-800">Expenses</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {pnlSummary.expenses.map((e) => (
                        <div key={e.code} className="flex justify-between px-4 py-2 text-sm">
                          <span className="text-slate-600">{e.code} - {e.name}</span>
                          <span className="font-mono text-slate-900">{formatCurrency(e.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between bg-red-50 px-4 py-2 text-sm font-semibold">
                        <span className="text-red-900">Total Expenses</span>
                        <span className="font-mono text-red-900">{formatCurrency(pnlSummary.totalExpenses)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net */}
                  <div className={`rounded-lg border p-4 ${pnlSummary.netProfitLoss >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                    <div className="flex justify-between text-sm font-bold">
                      <span className={pnlSummary.netProfitLoss >= 0 ? "text-green-900" : "text-red-900"}>
                        Net {pnlSummary.netProfitLoss >= 0 ? "Profit" : "Loss"}
                      </span>
                      <span className={`font-mono ${pnlSummary.netProfitLoss >= 0 ? "text-green-900" : "text-red-900"}`}>
                        {formatCurrency(Math.abs(pnlSummary.netProfitLoss))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setWizardOpen(false)
                    setWizardStep(1)
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setWizardStep(2)}
                  disabled={!selectedFY || !pnlSummary}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preview Retained Earnings JE */}
          {wizardStep === 2 && selectedFY && pnlSummary && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Step 2: Preview Retained Earnings Journal Entry
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  The following journal entry will be created to transfer the net profit/loss to retained earnings
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Account</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-600">Debit</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-600">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pnlSummary.netProfitLoss >= 0 ? (
                      <>
                        <tr>
                          <td className="px-4 py-3 text-slate-900">Profit & Loss Summary</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-900">
                            {formatCurrency(pnlSummary.netProfitLoss)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-400">-</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-slate-900">Retained Earnings</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-400">-</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-900">
                            {formatCurrency(pnlSummary.netProfitLoss)}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr>
                          <td className="px-4 py-3 text-slate-900">Retained Earnings</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-900">
                            {formatCurrency(Math.abs(pnlSummary.netProfitLoss))}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-400">-</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-slate-900">Profit & Loss Summary</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-400">-</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-900">
                            {formatCurrency(Math.abs(pnlSummary.netProfitLoss))}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td className="px-4 py-2 font-semibold text-slate-900">Total</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(Math.abs(pnlSummary.netProfitLoss))}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(Math.abs(pnlSummary.netProfitLoss))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any notes for this year-end close..."
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Period Locking</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      All 12 months of FY {selectedFY - 1}/{selectedFY} will be locked automatically. This prevents
                      any modifications to posted transactions in this period.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() => setWizardStep(1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={() => setWizardStep(3)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {wizardStep === 3 && selectedFY && pnlSummary && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Step 3: Confirm Year-End Close
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Please review and confirm the year-end close
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-slate-600">Financial Year</span>
                  <span className="text-sm font-semibold text-slate-900">
                    FY {selectedFY - 1}/{selectedFY}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-slate-600">Net {pnlSummary.netProfitLoss >= 0 ? "Profit" : "Loss"}</span>
                  <span className={`text-sm font-semibold font-mono ${pnlSummary.netProfitLoss >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatCurrency(Math.abs(pnlSummary.netProfitLoss))}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-slate-600">Retained Earnings JE</span>
                  <span className="text-sm font-semibold text-slate-900">Will be created</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-slate-600">Periods to Lock</span>
                  <span className="text-sm font-semibold text-slate-900">12 months</span>
                </div>
                {notes && (
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-sm text-slate-600">Notes</span>
                    <span className="text-sm text-slate-900">{notes}</span>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-900">
                  This action will:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-red-700">
                  <li>1. Create a retained earnings journal entry for {formatCurrency(Math.abs(pnlSummary.netProfitLoss))}</li>
                  <li>2. Lock all 12 monthly periods of FY {selectedFY - 1}/{selectedFY}</li>
                  <li>3. Mark the financial year as closed</li>
                </ul>
                <p className="mt-2 text-xs text-red-600">
                  This can be reversed later if needed.
                </p>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() => setWizardStep(2)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleCloseYear}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Closing...
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="h-4 w-4" />
                      Close Financial Year
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List of Year-End Closes */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Year-End Close History</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500">Loading...</div>
        ) : closes.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No year-end closes found. Use the wizard above to close a financial year.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {closes.map((close) => (
              <div
                key={close.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    close.status === "Completed"
                      ? "bg-green-100"
                      : close.status === "InProgress"
                      ? "bg-amber-100"
                      : "bg-slate-100"
                  }`}>
                    <CalendarCheck className={`h-5 w-5 ${
                      close.status === "Completed"
                        ? "text-green-600"
                        : close.status === "InProgress"
                        ? "text-amber-600"
                        : "text-slate-400"
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        FY {close.financialYear - 1}/{close.financialYear}
                      </p>
                      {getStatusBadge(close.status)}
                    </div>
                    <p className="text-xs text-slate-500">
                      {close.closedBy?.name ? `Closed by ${close.closedBy.name}` : ""}
                      {close.closeDate ? ` on ${formatDate(close.closeDate)}` : ""}
                      {close.notes ? ` - ${close.notes}` : ""}
                    </p>
                    {close.retainedEarningsEntry && (
                      <p className="text-xs text-indigo-600 mt-0.5">
                        <FileText className="inline h-3 w-3 mr-0.5" />
                        JE #{close.retainedEarningsEntry.entryNumber}
                      </p>
                    )}
                  </div>
                </div>
                {close.status === "Completed" && (
                  <button
                    onClick={() => handleReverse(close.id, close.financialYear)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Reverse
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
