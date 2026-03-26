"use client"

import { useState } from "react"
import Link from "next/link"
import { Shield, Sparkles, Calculator, TrendingUp, ChevronRight } from "lucide-react"

interface Strategy {
  id: string
  title: string
  description: string
  category: string
  estimatedSaving: number
  status: "Implemented" | "Not Implemented" | "Partially Implemented"
  priority: "High" | "Medium" | "Low"
}

const strategies: Strategy[] = [
  {
    id: "ts-001",
    title: "Salary Sacrifice to Super",
    description: "Allow employees to sacrifice pre-tax salary into superannuation, reducing income tax while boosting retirement savings. Effective up to the $30,000 concessional cap.",
    category: "Salary Sacrifice",
    estimatedSaving: 18500,
    status: "Implemented",
    priority: "High",
  },
  {
    id: "ts-002",
    title: "Salary Sacrifice - Laptop/Portable Devices",
    description: "Employees can salary sacrifice portable electronic devices (laptops, tablets) as exempt benefits under FBT rules for one item per category.",
    category: "Salary Sacrifice",
    estimatedSaving: 4200,
    status: "Not Implemented",
    priority: "Medium",
  },
  {
    id: "ts-003",
    title: "Novated Lease Program",
    description: "Establish a novated lease program allowing employees to access vehicle leasing through pre-tax salary, with potential FBT savings on EVs.",
    category: "Novated Lease",
    estimatedSaving: 12000,
    status: "Not Implemented",
    priority: "High",
  },
  {
    id: "ts-004",
    title: "Electric Vehicle FBT Exemption",
    description: "Zero-emission vehicles under novated lease arrangements are FBT-exempt (from 1 July 2022). Significant savings for EV salary packaging.",
    category: "FBT",
    estimatedSaving: 8500,
    status: "Not Implemented",
    priority: "High",
  },
  {
    id: "ts-005",
    title: "WFH Running Expenses",
    description: "Ensure employees claim the revised fixed rate (67c/hour) or actual cost method for working from home expenses. Employer can provide guidance.",
    category: "WFH",
    estimatedSaving: 6200,
    status: "Partially Implemented",
    priority: "Medium",
  },
  {
    id: "ts-006",
    title: "Employer Super Co-contribution",
    description: "Match employee voluntary contributions for lower-income employees to access government co-contribution scheme (up to $500 match).",
    category: "Super",
    estimatedSaving: 3000,
    status: "Not Implemented",
    priority: "Low",
  },
  {
    id: "ts-007",
    title: "Entertainment via Meal Cards",
    description: "Provide meal entertainment benefits through salary packaging, using the $2,650 minor benefit exemption threshold per employee.",
    category: "FBT",
    estimatedSaving: 5800,
    status: "Not Implemented",
    priority: "Medium",
  },
  {
    id: "ts-008",
    title: "R&D Staff Allocation",
    description: "Ensure R&D-eligible employees are correctly allocated to R&D activities for the 43.5% R&D tax incentive claim on their salary costs.",
    category: "R&D",
    estimatedSaving: 42000,
    status: "Implemented",
    priority: "High",
  },
]

const totalPotentialSavings = strategies.reduce((s, st) => s + st.estimatedSaving, 0)
const implementedSavings = strategies.filter((s) => s.status === "Implemented").reduce((sum, s) => sum + s.estimatedSaving, 0)

const categories = [...new Set(strategies.map((s) => s.category))]

const statusBadge: Record<string, string> = {
  Implemented: "bg-emerald-100 text-emerald-700",
  "Not Implemented": "bg-gray-100 text-gray-700",
  "Partially Implemented": "bg-amber-100 text-amber-700",
}

const priorityBadge: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-blue-100 text-blue-700",
}

const fmt = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function TaxStrategiesPage() {
  const [filterCategory, setFilterCategory] = useState("all")
  const [suggesting, setSuggesting] = useState(false)

  // Novated lease calculator
  const [leaseAnnualSalary, setLeaseAnnualSalary] = useState("130000")
  const [leaseAmount, setLeaseAmount] = useState("15000")
  const [leaseRunningCosts, setLeaseRunningCosts] = useState("4000")

  const salaryNum = parseFloat(leaseAnnualSalary) || 0
  const leaseNum = parseFloat(leaseAmount) || 0
  const runningNum = parseFloat(leaseRunningCosts) || 0
  const totalLeasePackage = leaseNum + runningNum
  const taxableIncomeWithout = salaryNum
  const taxableIncomeWith = salaryNum - totalLeasePackage
  // Simplified marginal tax estimate (37% bracket for $120k-$180k)
  const taxWithout = taxableIncomeWithout * 0.37
  const taxWith = taxableIncomeWith * 0.37
  const annualSaving = taxWithout - taxWith

  const filtered = strategies.filter(
    (s) => filterCategory === "all" || s.category === filterCategory
  )

  const handleSuggest = async () => {
    setSuggesting(true)
    await new Promise((r) => setTimeout(r, 2000))
    setSuggesting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tax Minimisation Strategies</h1>
          <p className="mt-1 text-sm text-slate-500">
            Optimise payroll tax efficiency for your organisation
          </p>
        </div>
        <button
          onClick={handleSuggest}
          disabled={suggesting}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {suggesting ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {suggesting ? "Analysing..." : "Suggest New Strategies"}
        </button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">Total Potential Savings</p>
              <p className="text-2xl font-bold text-emerald-900">${fmt(totalPotentialSavings)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Currently Saving</p>
              <p className="text-2xl font-bold text-slate-900">${fmt(implementedSavings)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Calculator className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Unrealised Savings</p>
              <p className="text-2xl font-bold text-amber-600">${fmt(totalPotentialSavings - implementedSavings)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-500">Filter by category:</span>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((strategy) => (
          <div key={strategy.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-slate-900">{strategy.title}</h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge[strategy.priority]}`}>
                    {strategy.priority}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{strategy.category}</p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{strategy.description}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[strategy.status]}`}>
                  {strategy.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Est. Annual Saving</p>
                <p className="text-lg font-bold text-emerald-600">${fmt(strategy.estimatedSaving)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Novated Lease Calculator */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Novated Lease Calculator</h2>
        <p className="text-sm text-slate-500 mb-6">
          Estimate potential savings from a novated lease arrangement
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Annual Salary ($)</label>
            <input
              type="number"
              value={leaseAnnualSalary}
              onChange={(e) => setLeaseAnnualSalary(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Annual Lease Amount ($)</label>
            <input
              type="number"
              value={leaseAmount}
              onChange={(e) => setLeaseAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Annual Running Costs ($)</label>
            <input
              type="number"
              value={leaseRunningCosts}
              onChange={(e) => setLeaseRunningCosts(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Total Package Cost</p>
            <p className="mt-1 text-lg font-bold text-slate-900">${fmt(totalLeasePackage)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Taxable Income (without)</p>
            <p className="mt-1 text-lg font-bold text-slate-900">${fmt(taxableIncomeWithout)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Taxable Income (with)</p>
            <p className="mt-1 text-lg font-bold text-slate-900">${fmt(taxableIncomeWith)}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-xs font-medium text-emerald-700">Estimated Annual Saving</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">${fmt(Math.max(0, annualSaving))}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          * This is a simplified estimate using the 37% marginal tax rate. Actual savings depend on individual tax circumstances, FBT implications, and GST credits. Consult a tax professional for precise calculations.
        </p>
      </div>
    </div>
  )
}
