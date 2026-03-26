"use client"

import Link from "next/link"
import { FileText, DollarSign, Landmark, Shield, Download, ChevronRight } from "lucide-react"

const reports = [
  {
    title: "Payment Summary (STP)",
    description: "Per-employee financial year summary including gross payments, tax withheld, super contributions, and reportable fringe benefits. Reported to ATO via Single Touch Payroll.",
    icon: FileText,
    color: "bg-blue-100 text-blue-600",
    metrics: [
      { label: "Employees", value: "24" },
      { label: "Total Gross", value: "$2,234,400" },
      { label: "Tax Withheld", value: "$536,256" },
      { label: "FY Period", value: "2025-26" },
    ],
    actions: ["Generate Report", "Lodge STP"],
  },
  {
    title: "Payroll Tax Summary",
    description: "State payroll tax obligations based on total Australian wages. Includes threshold calculations, deductions, and monthly/annual liability by state.",
    icon: DollarSign,
    color: "bg-amber-100 text-amber-600",
    metrics: [
      { label: "Total Wages", value: "$2,234,400" },
      { label: "Threshold (VIC)", value: "$900,000" },
      { label: "Taxable Wages", value: "$1,334,400" },
      { label: "Tax Rate", value: "4.85%" },
    ],
    actions: ["Generate Report", "View by State"],
  },
  {
    title: "Super Summary",
    description: "Quarterly superannuation obligations including SG amounts per employee, salary sacrifice contributions, and payment due dates for SuperStream.",
    icon: Landmark,
    color: "bg-violet-100 text-violet-600",
    metrics: [
      { label: "Q3 Obligation", value: "$63,533" },
      { label: "Due Date", value: "28 Apr 2026" },
      { label: "Employees", value: "24" },
      { label: "SG Rate", value: "11.5%" },
    ],
    actions: ["Generate Report", "Payment Schedule"],
  },
  {
    title: "Tax Minimisation Report",
    description: "Comprehensive overview of all tax optimisation strategies with ROI analysis, implementation status, and projected savings for the financial year.",
    icon: Shield,
    color: "bg-emerald-100 text-emerald-600",
    metrics: [
      { label: "Total Strategies", value: "8" },
      { label: "Implemented", value: "2" },
      { label: "Current Savings", value: "$60,500" },
      { label: "Potential Savings", value: "$100,200" },
    ],
    actions: ["Generate Report", "View Strategies"],
  },
]

export default function PayrollReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate and download payroll compliance and analytics reports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <div key={report.title} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-3 ${report.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-slate-900">{report.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">{report.description}</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {report.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-200 px-6 py-3 flex items-center gap-3">
                {report.actions.map((action, idx) => (
                  <button
                    key={action}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      idx === 0
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {idx === 0 && <Download className="h-3.5 w-3.5" />}
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Links */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "ATO Business Portal", href: "#" },
            { label: "SuperStream Provider", href: "#" },
            { label: "State Revenue Office", href: "#" },
            { label: "Fair Work Ombudsman", href: "#" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {link.label}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
