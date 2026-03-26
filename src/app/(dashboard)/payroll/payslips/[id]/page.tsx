"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"

const payslip = {
  id: "ps-001",
  employee: {
    name: "Sarah Chen",
    role: "Senior Engineer",
    employeeId: "EMP-001",
    taxFileNumber: "***-***-***",
    superFund: "Australian Super",
    memberNumber: "12345678",
  },
  employer: {
    name: "R&D Innovations Pty Ltd",
    abn: "12 345 678 901",
    address: "Level 10, 100 Collins St, Melbourne VIC 3000",
  },
  payPeriod: "1 Mar 2026 - 15 Mar 2026",
  payDate: "18 Mar 2026",
  earnings: [
    { description: "Base Salary", hours: 76, rate: 73.38, amount: 5576.92 },
  ],
  deductions: [
    { description: "PAYG Withholding Tax", amount: 1338.46 },
  ],
  superContributions: [
    { description: "Employer Super (11.5%)", amount: 641.35 },
  ],
  grossPay: 5576.92,
  totalDeductions: 1338.46,
  netPay: 4238.46,
  totalSuper: 641.35,
  ytd: {
    grossPay: 72500.00,
    tax: 17400.00,
    super: 8337.50,
    netPay: 55100.00,
  },
}

const fmt = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PayslipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/payroll/pay-runs"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pay Runs
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      {/* Payslip Document */}
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:shadow-none print:border-0 print:max-w-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">PAYSLIP</h1>
            <p className="mt-1 text-sm text-slate-500">Pay Period: {payslip.payPeriod}</p>
            <p className="text-sm text-slate-500">Pay Date: {payslip.payDate}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{payslip.employer.name}</p>
            <p className="text-xs text-slate-500">ABN: {payslip.employer.abn}</p>
            <p className="text-xs text-slate-500">{payslip.employer.address}</p>
          </div>
        </div>

        {/* Employee Info */}
        <div className="mt-6 grid grid-cols-2 gap-6 border-b border-slate-200 pb-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Employee</h3>
            <p className="text-sm font-medium text-slate-900">{payslip.employee.name}</p>
            <p className="text-xs text-slate-500">{payslip.employee.role}</p>
            <p className="text-xs text-slate-500">Employee ID: {payslip.employee.employeeId}</p>
            <p className="text-xs text-slate-500">TFN: {payslip.employee.taxFileNumber}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Superannuation</h3>
            <p className="text-sm text-slate-700">{payslip.employee.superFund}</p>
            <p className="text-xs text-slate-500">Member: {payslip.employee.memberNumber}</p>
          </div>
        </div>

        {/* Earnings */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Earnings</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2 text-left text-xs font-medium text-slate-500">Description</th>
                <th className="pb-2 text-right text-xs font-medium text-slate-500">Hours</th>
                <th className="pb-2 text-right text-xs font-medium text-slate-500">Rate</th>
                <th className="pb-2 text-right text-xs font-medium text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payslip.earnings.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-2 text-sm text-slate-700">{item.description}</td>
                  <td className="py-2 text-right text-sm text-slate-600">{item.hours}</td>
                  <td className="py-2 text-right text-sm text-slate-600">${fmt(item.rate)}</td>
                  <td className="py-2 text-right text-sm font-medium text-slate-900">${fmt(item.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-200">
                <td colSpan={3} className="py-2 text-sm font-semibold text-slate-900">Gross Pay</td>
                <td className="py-2 text-right text-sm font-bold text-slate-900">${fmt(payslip.grossPay)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Deductions</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2 text-left text-xs font-medium text-slate-500">Description</th>
                <th className="pb-2 text-right text-xs font-medium text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payslip.deductions.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-2 text-sm text-slate-700">{item.description}</td>
                  <td className="py-2 text-right text-sm text-slate-600">${fmt(item.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-200">
                <td className="py-2 text-sm font-semibold text-slate-900">Total Deductions</td>
                <td className="py-2 text-right text-sm font-bold text-slate-900">${fmt(payslip.totalDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Super */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Superannuation</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2 text-left text-xs font-medium text-slate-500">Description</th>
                <th className="pb-2 text-right text-xs font-medium text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payslip.superContributions.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-2 text-sm text-slate-700">{item.description}</td>
                  <td className="py-2 text-right text-sm text-slate-600">${fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Net Pay */}
        <div className="mt-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-900">Net Pay</span>
            <span className="text-2xl font-bold text-emerald-700">${fmt(payslip.netPay)}</span>
          </div>
        </div>

        {/* YTD */}
        <div className="mt-6 border-t border-slate-200 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Year to Date (FY 2025-26)</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Gross Pay</p>
              <p className="text-sm font-medium text-slate-900">${fmt(payslip.ytd.grossPay)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Tax Withheld</p>
              <p className="text-sm font-medium text-slate-900">${fmt(payslip.ytd.tax)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Super</p>
              <p className="text-sm font-medium text-slate-900">${fmt(payslip.ytd.super)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Net Pay</p>
              <p className="text-sm font-medium text-slate-900">${fmt(payslip.ytd.netPay)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
