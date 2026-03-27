"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Handshake,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface Contract {
  id: string
  contractNumber: string
  title: string
  providerName: string
  providerBusiness: string
  agreedAmount: number
  status: string
  startDate: string
  endDate: string
  progress: number
  milestonesTotal: number
  milestonesCompleted: number
  invoicedAmount: number
  paidAmount: number
}

const allContracts: Contract[] = [
  { id: "con-001", contractNumber: "MKT-2026-001", title: "Materials Testing - Phase 1", providerName: "Dr. Sarah Chen", providerBusiness: "LabCorp Sciences", agreedAmount: 82000, status: "Active", startDate: "2026-04-15", endDate: "2026-07-01", progress: 65, milestonesTotal: 4, milestonesCompleted: 2, invoicedAmount: 41000, paidAmount: 41000 },
  { id: "con-002", contractNumber: "MKT-2026-002", title: "Patent Filing Support", providerName: "James Rodriguez", providerBusiness: "IP Protect Ltd", agreedAmount: 12000, status: "Active", startDate: "2026-03-01", endDate: "2026-04-30", progress: 90, milestonesTotal: 3, milestonesCompleted: 2, invoicedAmount: 10800, paidAmount: 8000 },
  { id: "con-003", contractNumber: "MKT-2026-003", title: "Data Analysis Pipeline", providerName: "Michael Park", providerBusiness: "DataForge Analytics", agreedAmount: 28000, status: "Completed", startDate: "2026-01-15", endDate: "2026-03-15", progress: 100, milestonesTotal: 3, milestonesCompleted: 3, invoicedAmount: 28000, paidAmount: 28000 },
  { id: "con-004", contractNumber: "MKT-2026-004", title: "Environmental Compliance Review", providerName: "Dr. Priya Sharma", providerBusiness: "EnviroTest Solutions", agreedAmount: 45000, status: "OnHold", startDate: "2026-05-01", endDate: "2026-08-30", progress: 10, milestonesTotal: 5, milestonesCompleted: 0, invoicedAmount: 0, paidAmount: 0 },
  { id: "con-005", contractNumber: "MKT-2026-005", title: "Nanotechnology Surface Characterisation", providerName: "Dr. Alex Kumar", providerBusiness: "NanoTech Research", agreedAmount: 65000, status: "Draft", startDate: "2026-06-01", endDate: "2026-08-15", progress: 0, milestonesTotal: 4, milestonesCompleted: 0, invoicedAmount: 0, paidAmount: 0 },
]

const statusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Active: "bg-emerald-100 text-emerald-700",
  OnHold: "bg-amber-100 text-amber-700",
  Completed: "bg-blue-100 text-blue-700",
  Terminated: "bg-red-100 text-red-700",
  Disputed: "bg-red-100 text-red-700",
}

const statusFilters = ["All", "Draft", "Active", "OnHold", "Completed", "Terminated"]

export default function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = allContracts.filter((c) => {
    if (statusFilter !== "All" && c.status !== statusFilter) return false
    return true
  })

  // Summary stats
  const totalActive = allContracts.filter((c) => c.status === "Active").length
  const totalValue = allContracts.reduce((sum, c) => sum + c.agreedAmount, 0)
  const totalInvoiced = allContracts.reduce((sum, c) => sum + c.invoicedAmount, 0)
  const totalPaid = allContracts.reduce((sum, c) => sum + c.paidAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contracts</h1>
        <p className="text-sm text-slate-500 mt-1">Manage marketplace contracts with specialist providers</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Handshake className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-medium text-slate-500">Active</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalActive}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-indigo-500" />
            <p className="text-sm font-medium text-indigo-600">Total Value</p>
          </div>
          <p className="text-2xl font-bold text-indigo-700">${totalValue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium text-blue-600">Invoiced</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">${totalInvoiced.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-600">Paid</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">${totalPaid.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
        >
          {statusFilters.map((s) => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
        </select>
      </div>

      {/* Contract Cards */}
      <div className="space-y-4">
        {filtered.map((contract) => (
          <Link
            key={contract.id}
            href={`/marketplace/contracts/${contract.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-mono text-slate-400">{contract.contractNumber}</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[contract.status] || "bg-slate-100 text-slate-700"}`}>
                    {contract.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{contract.title}</h3>
                <p className="text-xs text-slate-500">{contract.providerName} - {contract.providerBusiness}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">${contract.agreedAmount.toLocaleString()}</p>
                <p className="text-xs text-slate-500">{contract.startDate} - {contract.endDate}</p>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Progress</span>
                  <span>{contract.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      contract.progress === 100 ? "bg-slate-400" :
                      contract.progress >= 75 ? "bg-emerald-500" :
                      contract.progress >= 50 ? "bg-indigo-500" :
                      contract.progress >= 25 ? "bg-blue-500" :
                      "bg-slate-300"
                    }`}
                    style={{ width: `${contract.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{contract.milestonesCompleted}/{contract.milestonesTotal} milestones</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <DollarSign className="h-3.5 w-3.5" />
                <span>${contract.paidAmount.toLocaleString()} paid</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No contracts found matching the selected filter.</p>
        </div>
      )}
    </div>
  )
}
