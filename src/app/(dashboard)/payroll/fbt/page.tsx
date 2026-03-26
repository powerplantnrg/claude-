"use client"

import { useState } from "react"
import { Plus, Briefcase } from "lucide-react"

interface FBTRecord {
  id: string
  employee: string
  benefitType: string
  description: string
  grossValue: number
  fbtLiability: number
  fbtYear: string
  startDate: string
  endDate: string
  status: "Active" | "Ended"
}

const fbtRecords: FBTRecord[] = [
  { id: "fbt-001", employee: "Sarah Chen", benefitType: "Car Parking", description: "CBD car park - daily rate", grossValue: 5200, fbtLiability: 4867, fbtYear: "2025-26", startDate: "1 Apr 2025", endDate: "31 Mar 2026", status: "Active" },
  { id: "fbt-002", employee: "James Wilson", benefitType: "Entertainment", description: "Client entertainment - meal cards", grossValue: 2400, fbtLiability: 2246, fbtYear: "2025-26", startDate: "1 Apr 2025", endDate: "31 Mar 2026", status: "Active" },
  { id: "fbt-003", employee: "Anna Roberts", benefitType: "Laptop", description: "Salary sacrifice laptop (exempt)", grossValue: 2800, fbtLiability: 0, fbtYear: "2025-26", startDate: "15 Jul 2025", endDate: "14 Jul 2026", status: "Active" },
  { id: "fbt-004", employee: "Tom Baker", benefitType: "Novated Lease", description: "Electric vehicle novated lease (exempt)", grossValue: 15000, fbtLiability: 0, fbtYear: "2025-26", startDate: "1 Oct 2025", endDate: "30 Sep 2028", status: "Active" },
  { id: "fbt-005", employee: "Priya Sharma", benefitType: "Entertainment", description: "Team event catering", grossValue: 1500, fbtLiability: 1403, fbtYear: "2025-26", startDate: "1 Apr 2025", endDate: "31 Mar 2026", status: "Active" },
  { id: "fbt-006", employee: "Emily Zhang", benefitType: "Gym Membership", description: "Corporate gym membership", grossValue: 1200, fbtLiability: 1123, fbtYear: "2024-25", startDate: "1 Apr 2024", endDate: "31 Mar 2025", status: "Ended" },
]

const totalGrossValue = fbtRecords.filter((r) => r.status === "Active").reduce((s, r) => s + r.grossValue, 0)
const totalFBTLiability = fbtRecords.filter((r) => r.status === "Active").reduce((s, r) => s + r.fbtLiability, 0)
const exemptBenefits = fbtRecords.filter((r) => r.status === "Active" && r.fbtLiability === 0)

const fmt = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const statusBadge: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Ended: "bg-gray-100 text-gray-700",
}

const benefitTypeBadge: Record<string, string> = {
  "Car Parking": "bg-blue-100 text-blue-700",
  Entertainment: "bg-violet-100 text-violet-700",
  Laptop: "bg-indigo-100 text-indigo-700",
  "Novated Lease": "bg-emerald-100 text-emerald-700",
  "Gym Membership": "bg-amber-100 text-amber-700",
}

export default function FBTPage() {
  const [showForm, setShowForm] = useState(false)
  const [newEmployee, setNewEmployee] = useState("")
  const [newBenefitType, setNewBenefitType] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newGrossValue, setNewGrossValue] = useState("")
  const [newStartDate, setNewStartDate] = useState("")
  const [newEndDate, setNewEndDate] = useState("")

  const handleAddBenefit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowForm(false)
    setNewEmployee("")
    setNewBenefitType("")
    setNewDescription("")
    setNewGrossValue("")
    setNewStartDate("")
    setNewEndDate("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fringe Benefits Tax (FBT)</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage fringe benefits and track FBT liabilities (FBT Year: 1 Apr 2025 - 31 Mar 2026)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Benefit
        </button>
      </div>

      {/* FBT Year Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active Benefits</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{fbtRecords.filter((r) => r.status === "Active").length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Gross Value</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">${fmt(totalGrossValue)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-sm font-medium text-amber-800">Total FBT Liability</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">${fmt(totalFBTLiability)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="text-sm font-medium text-emerald-800">Exempt Benefits</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{exemptBenefits.length}</p>
          <p className="text-xs text-emerald-600">${fmt(exemptBenefits.reduce((s, r) => s + r.grossValue, 0))} in exempt value</p>
        </div>
      </div>

      {/* Add Benefit Form */}
      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Add New Fringe Benefit</h2>
          <form onSubmit={handleAddBenefit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Employee</label>
                <select
                  value={newEmployee}
                  onChange={(e) => setNewEmployee(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select employee...</option>
                  <option>Sarah Chen</option>
                  <option>James Wilson</option>
                  <option>Priya Sharma</option>
                  <option>Tom Baker</option>
                  <option>Emily Zhang</option>
                  <option>Michael Lee</option>
                  <option>Anna Roberts</option>
                  <option>Lisa Nguyen</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Benefit Type</label>
                <select
                  value={newBenefitType}
                  onChange={(e) => setNewBenefitType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select type...</option>
                  <option>Car Parking</option>
                  <option>Entertainment</option>
                  <option>Laptop</option>
                  <option>Novated Lease</option>
                  <option>Gym Membership</option>
                  <option>Living Away From Home</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Gross Value ($)</label>
                <input
                  type="number"
                  value={newGrossValue}
                  onChange={(e) => setNewGrossValue(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Add Benefit
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Fringe Benefit Records</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Employee</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Value</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">FBT Liability</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Period</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fbtRecords.map((record) => (
              <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{record.employee}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${benefitTypeBadge[record.benefitType] || "bg-gray-100 text-gray-700"}`}>
                    {record.benefitType}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{record.description}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">${fmt(record.grossValue)}</td>
                <td className="px-6 py-4 text-right text-sm">
                  {record.fbtLiability === 0 ? (
                    <span className="font-medium text-emerald-600">Exempt</span>
                  ) : (
                    <span className="font-medium text-slate-900">${fmt(record.fbtLiability)}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  <span className="text-xs">{record.startDate} - {record.endDate}</span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[record.status]}`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
