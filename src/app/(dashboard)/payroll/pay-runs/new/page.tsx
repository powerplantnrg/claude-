"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const employeePreview = [
  { id: "emp-001", name: "Sarah Chen", role: "Senior Engineer", type: "Full-time", gross: 5576.92, tax: 1338.46, super: 641.35, net: 4238.46 },
  { id: "emp-002", name: "James Wilson", role: "Product Manager", type: "Full-time", gross: 5192.31, tax: 1246.15, super: 597.12, net: 3946.16 },
  { id: "emp-003", name: "Priya Sharma", role: "Data Scientist", type: "Full-time", gross: 5000.00, tax: 1200.00, super: 575.00, net: 3800.00 },
  { id: "emp-004", name: "Tom Baker", role: "DevOps Engineer", type: "Full-time", gross: 4807.69, tax: 1153.85, super: 552.88, net: 3653.84 },
  { id: "emp-005", name: "Emily Zhang", role: "UX Designer", type: "Full-time", gross: 4423.08, tax: 1061.54, super: 508.65, net: 3361.54 },
  { id: "emp-006", name: "Michael Lee", role: "Frontend Developer", type: "Part-time", gross: 2500.00, tax: 600.00, super: 287.50, net: 1900.00 },
  { id: "emp-007", name: "Anna Roberts", role: "R&D Researcher", type: "Full-time", gross: 4615.38, tax: 1107.69, super: 553.85, net: 3507.69 },
  { id: "emp-009", name: "Lisa Nguyen", role: "QA Lead", type: "Full-time", gross: 4230.77, tax: 1015.38, super: 486.54, net: 3215.39 },
]

const fmt = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function NewPayRunPage() {
  const router = useRouter()
  const [payPeriodStart, setPayPeriodStart] = useState("2026-03-16")
  const [payPeriodEnd, setPayPeriodEnd] = useState("2026-03-31")
  const [payDate, setPayDate] = useState("2026-04-01")
  const [payFrequency, setPayFrequency] = useState("Fortnightly")
  const [submitting, setSubmitting] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(
    new Set(employeePreview.map((e) => e.id))
  )

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedEmployees.size === employeePreview.length) {
      setSelectedEmployees(new Set())
    } else {
      setSelectedEmployees(new Set(employeePreview.map((e) => e.id)))
    }
  }

  const selected = employeePreview.filter((e) => selectedEmployees.has(e.id))
  const totalGross = selected.reduce((s, e) => s + e.gross, 0)
  const totalTax = selected.reduce((s, e) => s + e.tax, 0)
  const totalSuper = selected.reduce((s, e) => s + e.super, 0)
  const totalNet = selected.reduce((s, e) => s + e.net, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    router.push("/payroll/pay-runs")
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/payroll/pay-runs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pay Runs
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Pay Run</h1>
          <p className="mt-1 text-sm text-slate-500">Configure and preview the pay run before processing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pay Period Settings */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Pay Period</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Frequency</label>
              <select
                value={payFrequency}
                onChange={(e) => setPayFrequency(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option>Weekly</option>
                <option>Fortnightly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Period Start</label>
              <input
                type="date"
                value={payPeriodStart}
                onChange={(e) => setPayPeriodStart(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Period End</label>
              <input
                type="date"
                value={payPeriodEnd}
                onChange={(e) => setPayPeriodEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Pay Date</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Employee Preview */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Employees to be Paid ({selected.length} of {employeePreview.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.size === employeePreview.length}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Gross</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Tax</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Super</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Net Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeePreview.map((emp) => (
                  <tr key={emp.id} className={`transition-colors ${selectedEmployees.has(emp.id) ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 opacity-60"}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{emp.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{emp.role}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">${fmt(emp.gross)}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">${fmt(emp.tax)}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">${fmt(emp.super)}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">${fmt(emp.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-sm font-semibold text-slate-900">Totals</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">${fmt(totalGross)}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">${fmt(totalTax)}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">${fmt(totalSuper)}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">${fmt(totalNet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/payroll/pay-runs"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || selected.length === 0}
            className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && (
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {submitting ? "Creating..." : "Create Pay Run"}
          </button>
        </div>
      </form>
    </div>
  )
}
