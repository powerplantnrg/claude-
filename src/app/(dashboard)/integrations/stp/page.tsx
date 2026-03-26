"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface EmployeeSummary {
  employeeId: string
  firstName: string
  lastName: string
  employmentType: string
  taxFileNumber: string
  ytdGrossPay: number
  ytdTaxWithheld: number
  ytdSuperannuation: number
  ytdNetPay: number
  payslipCount: number
}

interface StpReport {
  filingId: string
  filingDate: string
  status: string
  filingType: string
  paymentPeriod: string
  employees: EmployeeSummary[]
  totals: {
    totalEmployees: number
    totalGrossPay: number
    totalTaxWithheld: number
    totalSuperannuation: number
    totalNetPay: number
  }
  atoResponse: {
    status: string
    receiptNumber: string
    lodgementDate: string
    message: string
  }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  })
}

export default function StpFilingPage() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filing, setFiling] = useState(false)
  const [lastReport, setLastReport] = useState<StpReport | null>(null)
  const [filingHistory, setFilingHistory] = useState<StpReport[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    // Fetch employee data for preview
    async function fetchEmployees() {
      try {
        const res = await fetch("/api/integrations/stp", {
          method: "POST",
        })
        if (res.ok) {
          const data = await res.json()
          setEmployees(data.employees)
          // Store as last report preview (not actually filed yet from user perspective)
        } else {
          const data = await res.json()
          if (data.error !== "No active employees found for STP filing") {
            setError(data.error)
          }
        }
      } catch {
        // silently handle - employees will be empty
      } finally {
        setLoading(false)
      }
    }
    fetchEmployees()
  }, [])

  async function handleLodgeStp() {
    setFiling(true)
    setError("")
    try {
      const res = await fetch("/api/integrations/stp", {
        method: "POST",
      })
      if (res.ok) {
        const report = await res.json()
        setLastReport(report)
        setFilingHistory((prev) => [report, ...prev])
      } else {
        const data = await res.json()
        setError(data.error || "Failed to lodge STP filing")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setFiling(false)
    }
  }

  const totals = employees.reduce(
    (acc, emp) => ({
      grossPay: acc.grossPay + emp.ytdGrossPay,
      taxWithheld: acc.taxWithheld + emp.ytdTaxWithheld,
      super: acc.super + emp.ytdSuperannuation,
      netPay: acc.netPay + emp.ytdNetPay,
    }),
    { grossPay: 0, taxWithheld: 0, super: 0, netPay: 0 }
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/integrations" className="hover:text-slate-700">
          Integrations
        </Link>
        <span>/</span>
        <span className="text-slate-900">STP Filing</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Single Touch Payroll (STP)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Lodge employee payment summaries with the Australian Taxation Office
          </p>
        </div>
        <button
          onClick={handleLodgeStp}
          disabled={filing || employees.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {filing ? "Lodging..." : "Lodge with ATO"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Last Filing Result */}
      {lastReport && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-5 w-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-green-900">
                STP Filing {lastReport.atoResponse.status}
              </h3>
              <p className="mt-1 text-xs text-green-700">
                {lastReport.atoResponse.message}
              </p>
              <div className="mt-2 flex gap-4 text-xs text-green-800">
                <span>Receipt: {lastReport.atoResponse.receiptNumber}</span>
                <span>Filing ID: {lastReport.filingId}</span>
                <span>
                  Date:{" "}
                  {new Date(lastReport.filingDate).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YTD Summary Cards */}
      {employees.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              YTD Gross Pay
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatCurrency(totals.grossPay)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              YTD Tax Withheld
            </p>
            <p className="mt-1 text-xl font-bold text-red-600">
              {formatCurrency(totals.taxWithheld)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              YTD Super
            </p>
            <p className="mt-1 text-xl font-bold text-indigo-600">
              {formatCurrency(totals.super)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              YTD Net Pay
            </p>
            <p className="mt-1 text-xl font-bold text-green-600">
              {formatCurrency(totals.netPay)}
            </p>
          </div>
        </div>
      )}

      {/* Employee Payment Summary Table */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">Loading employee data...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            No active employees found. Add employees in the Payroll section first.
          </p>
          <Link
            href="/payroll/employees"
            className="mt-3 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Go to Employees
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Employee Payment Summary ({employees.length} employees)
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    TFN
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    YTD Gross
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    YTD Tax
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    YTD Super
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    YTD Net
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Payslips
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {employees.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {emp.employmentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono">
                      {emp.taxFileNumber}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-900">
                      {formatCurrency(emp.ytdGrossPay)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">
                      {formatCurrency(emp.ytdTaxWithheld)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-indigo-600">
                      {formatCurrency(emp.ytdSuperannuation)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">
                      {formatCurrency(emp.ytdNetPay)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-500">
                      {emp.payslipCount}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-sm font-semibold text-slate-900"
                  >
                    Totals
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(totals.grossPay)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">
                    {formatCurrency(totals.taxWithheld)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-indigo-600">
                    {formatCurrency(totals.super)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                    {formatCurrency(totals.netPay)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Filing History */}
      {filingHistory.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Filing History</h2>
          <div className="space-y-3">
            {filingHistory.map((report) => (
              <div
                key={report.filingId}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    {report.status}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {report.filingType} - {report.paymentPeriod}
                    </p>
                    <p className="text-xs text-slate-500">
                      {report.totals.totalEmployees} employees | Gross:{" "}
                      {formatCurrency(report.totals.totalGrossPay)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-slate-500">
                    {report.atoResponse.receiptNumber}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(report.filingDate).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
