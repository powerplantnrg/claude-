"use client"

import { useState } from "react"
import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, MapPin, Calendar, DollarSign, Building, FileText } from "lucide-react"

const employee = {
  id: "emp-001",
  firstName: "Sarah",
  lastName: "Chen",
  email: "sarah@company.com",
  phone: "0412 345 678",
  dateOfBirth: "1992-06-15",
  address: "42 Innovation Drive",
  city: "Melbourne",
  state: "VIC",
  postcode: "3000",
  role: "Senior Engineer",
  department: "Engineering",
  type: "Full-time",
  salary: 145000,
  superRate: 11.5,
  payFrequency: "Fortnightly",
  hoursPerWeek: 38,
  startDate: "2023-03-15",
  status: "Active",
  tfn: "***-***-***",
  taxFreeThreshold: true,
  helpDebt: false,
  superFundName: "Australian Super",
  superMemberNumber: "12345678",
  bsb: "063-000",
  accountNumber: "****1234",
  accountName: "Sarah Chen",
}

const payHistory = [
  { id: "ps-001", period: "1 Mar - 15 Mar 2026", gross: 5576.92, tax: 1338.46, super: 641.35, net: 4238.46, status: "Paid" },
  { id: "ps-002", period: "16 Feb - 28 Feb 2026", gross: 5576.92, tax: 1338.46, super: 641.35, net: 4238.46, status: "Paid" },
  { id: "ps-003", period: "1 Feb - 15 Feb 2026", gross: 5576.92, tax: 1338.46, super: 641.35, net: 4238.46, status: "Paid" },
  { id: "ps-004", period: "16 Jan - 31 Jan 2026", gross: 5576.92, tax: 1338.46, super: 641.35, net: 4238.46, status: "Paid" },
  { id: "ps-005", period: "1 Jan - 15 Jan 2026", gross: 5576.92, tax: 1338.46, super: 641.35, net: 4238.46, status: "Paid" },
]

const leaveBalances = [
  { type: "Annual Leave", accrued: 15.5, taken: 5, balance: 10.5, unit: "days" },
  { type: "Personal/Sick Leave", accrued: 8.0, taken: 2, balance: 6.0, unit: "days" },
  { type: "Long Service Leave", accrued: 0, taken: 0, balance: 0, unit: "weeks" },
  { type: "Compassionate Leave", accrued: 2, taken: 0, balance: 2, unit: "days" },
]

const tabs = ["Overview", "Pay History", "Leave Balances", "Tax Info", "Documents"]

const fmt = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const statusBadge: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  "On Leave": "bg-amber-100 text-amber-700",
  Terminated: "bg-red-100 text-red-700",
  Paid: "bg-emerald-100 text-emerald-700",
}

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = useState("Overview")

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/employees"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Employees
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {employee.firstName} {employee.lastName}
            </h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[employee.status]}`}>
              {employee.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{employee.role} - {employee.department}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/payroll/employees/${id}/edit`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Personal Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-slate-700">{employee.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-slate-700">{employee.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-slate-700">{employee.address}, {employee.city} {employee.state} {employee.postcode}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-700">DOB: {new Date(employee.dateOfBirth).toLocaleDateString("en-AU")}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Employment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Type</p>
                <p className="text-sm text-slate-900">{employee.type}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Start Date</p>
                <p className="text-sm text-slate-900">{new Date(employee.startDate).toLocaleDateString("en-AU")}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Annual Salary</p>
                <p className="text-sm font-medium text-slate-900">${fmt(employee.salary)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Pay Frequency</p>
                <p className="text-sm text-slate-900">{employee.payFrequency}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Hours/Week</p>
                <p className="text-sm text-slate-900">{employee.hoursPerWeek}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Super Rate</p>
                <p className="text-sm text-slate-900">{employee.superRate}%</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Superannuation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Fund Name</p>
                <p className="text-sm text-slate-900">{employee.superFundName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Member Number</p>
                <p className="text-sm text-slate-900">{employee.superMemberNumber}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Bank Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">BSB</p>
                <p className="text-sm font-mono text-slate-900">{employee.bsb}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Account Number</p>
                <p className="text-sm font-mono text-slate-900">{employee.accountNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Account Name</p>
                <p className="text-sm text-slate-900">{employee.accountName}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Pay History" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Period</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Gross</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Tax</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Super</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Net Pay</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payHistory.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm">
                    <Link href={`/payroll/payslips/${pay.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                      {pay.period}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">${fmt(pay.gross)}</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-600">${fmt(pay.tax)}</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-600">${fmt(pay.super)}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">${fmt(pay.net)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[pay.status] || "bg-gray-100 text-gray-700"}`}>
                      {pay.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "Leave Balances" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {leaveBalances.map((leave) => (
            <div key={leave.type} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">{leave.type}</h3>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Accrued</p>
                  <p className="text-lg font-bold text-slate-900">{leave.accrued} <span className="text-xs font-normal text-slate-400">{leave.unit}</span></p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Taken</p>
                  <p className="text-lg font-bold text-slate-900">{leave.taken} <span className="text-xs font-normal text-slate-400">{leave.unit}</span></p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Balance</p>
                  <p className="text-lg font-bold text-emerald-600">{leave.balance} <span className="text-xs font-normal text-slate-400">{leave.unit}</span></p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: leave.accrued > 0 ? `${(leave.balance / leave.accrued) * 100}%` : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Tax Info" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Tax Information</h3>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-slate-500">TFN</p>
              <p className="text-sm font-mono text-slate-900">{employee.tfn}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Tax-Free Threshold</p>
              <p className="text-sm text-slate-900">{employee.taxFreeThreshold ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">HELP Debt</p>
              <p className="text-sm text-slate-900">{employee.helpDebt ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">YTD Tax Withheld</p>
              <p className="text-sm font-medium text-slate-900">$17,169.90</p>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">YTD Summary (FY 2025-26)</h4>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Gross Earnings</p>
                <p className="text-sm font-medium text-slate-900">$108,461.40</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Tax Withheld</p>
                <p className="text-sm font-medium text-slate-900">$26,030.70</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Super Contributions</p>
                <p className="text-sm font-medium text-slate-900">$12,473.06</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Net Pay</p>
                <p className="text-sm font-medium text-slate-900">$82,430.70</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Documents" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Employee Documents</h3>
          <div className="space-y-3">
            {[
              { name: "Employment Contract", date: "15 Mar 2023", type: "PDF" },
              { name: "Tax File Declaration", date: "15 Mar 2023", type: "PDF" },
              { name: "Super Choice Form", date: "15 Mar 2023", type: "PDF" },
              { name: "FY 2024-25 Payment Summary", date: "14 Jul 2025", type: "PDF" },
            ].map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                    <p className="text-xs text-slate-400">{doc.date} - {doc.type}</p>
                  </div>
                </div>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-800">Download</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
