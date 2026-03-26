"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Filter, UserPlus } from "lucide-react"

interface Employee {
  id: string
  name: string
  email: string
  role: string
  type: "Full-time" | "Part-time" | "Contractor" | "Casual"
  salary: number
  superRate: number
  status: "Active" | "On Leave" | "Terminated"
  startDate: string
}

const employees: Employee[] = [
  { id: "emp-001", name: "Sarah Chen", email: "sarah@company.com", role: "Senior Engineer", type: "Full-time", salary: 145000, superRate: 11.5, status: "Active", startDate: "2023-03-15" },
  { id: "emp-002", name: "James Wilson", email: "james@company.com", role: "Product Manager", type: "Full-time", salary: 135000, superRate: 11.5, status: "Active", startDate: "2022-08-01" },
  { id: "emp-003", name: "Priya Sharma", email: "priya@company.com", role: "Data Scientist", type: "Full-time", salary: 130000, superRate: 11.5, status: "Active", startDate: "2023-06-12" },
  { id: "emp-004", name: "Tom Baker", email: "tom@company.com", role: "DevOps Engineer", type: "Full-time", salary: 125000, superRate: 11.5, status: "Active", startDate: "2024-01-08" },
  { id: "emp-005", name: "Emily Zhang", email: "emily@company.com", role: "UX Designer", type: "Full-time", salary: 115000, superRate: 11.5, status: "On Leave", startDate: "2023-09-20" },
  { id: "emp-006", name: "Michael Lee", email: "michael@company.com", role: "Frontend Developer", type: "Part-time", salary: 65000, superRate: 11.5, status: "Active", startDate: "2024-04-01" },
  { id: "emp-007", name: "Anna Roberts", email: "anna@company.com", role: "R&D Researcher", type: "Full-time", salary: 120000, superRate: 12.0, status: "Active", startDate: "2022-11-15" },
  { id: "emp-008", name: "David Kim", email: "david@company.com", role: "Cloud Consultant", type: "Contractor", salary: 150000, superRate: 0, status: "Active", startDate: "2025-01-10" },
  { id: "emp-009", name: "Lisa Nguyen", email: "lisa@company.com", role: "QA Lead", type: "Full-time", salary: 110000, superRate: 11.5, status: "Active", startDate: "2023-05-22" },
  { id: "emp-010", name: "Chris Brown", email: "chris@company.com", role: "Intern", type: "Casual", salary: 55000, superRate: 11.5, status: "Terminated", startDate: "2025-07-01" },
]

const statusBadge: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  "On Leave": "bg-amber-100 text-amber-700",
  Terminated: "bg-red-100 text-red-700",
}

const typeBadge: Record<string, string> = {
  "Full-time": "bg-blue-100 text-blue-700",
  "Part-time": "bg-violet-100 text-violet-700",
  Contractor: "bg-orange-100 text-orange-700",
  Casual: "bg-gray-100 text-gray-700",
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function EmployeesPage() {
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.role.toLowerCase().includes(search.toLowerCase())
    const matchesType = filterType === "all" || emp.type === filterType
    const matchesStatus = filterStatus === "all" || emp.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage employee records and payroll details
          </p>
        </div>
        <Link
          href="/payroll/employees/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Employee
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contractor">Contractor</option>
          <option value="Casual">Casual</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Terminated">Terminated</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Salary</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Super Rate</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                  No employees match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/payroll/employees/${emp.id}`} className="font-medium text-blue-600 hover:text-blue-800 text-sm">
                      {emp.name}
                    </Link>
                    <p className="text-xs text-slate-400">{emp.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{emp.role}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadge[emp.type]}`}>
                      {emp.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">${fmt(emp.salary)}</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-600">{emp.superRate}%</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[emp.status]}`}>
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
