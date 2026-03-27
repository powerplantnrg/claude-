"use client"

import { use } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  Check,
  X,
  ShoppingCart,
  Lightbulb,
  ArrowRight,
  Send,
  Tag,
} from "lucide-react"

const statusSteps = ["Draft", "Published", "In Market", "Fulfilled"]

const statusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Published: "bg-blue-100 text-blue-700",
  "In Market": "bg-emerald-100 text-emerald-700",
  Fulfilled: "bg-indigo-100 text-indigo-700",
  "Not Published": "bg-slate-100 text-slate-600",
  Listed: "bg-emerald-100 text-emerald-700",
}

const categoryColors: Record<string, string> = {
  "Research Scientists": "bg-indigo-100 text-indigo-700",
  "Lab Technicians": "bg-emerald-100 text-emerald-700",
  "Engineering Consultants": "bg-blue-100 text-blue-700",
  "IP / Patent Specialists": "bg-amber-100 text-amber-700",
  "Testing & QA": "bg-purple-100 text-purple-700",
  "Lab Services": "bg-teal-100 text-teal-700",
}

interface RequirementItem {
  id: string
  title: string
  category: string
  quantity: number
  duration: string
  budget: number
  status: string
}

interface AISuggestion {
  id: string
  title: string
  category: string
  quantity: number
  duration: string
  estimatedCost: number
  rationale: string
}

interface Listing {
  id: string
  title: string
  category: string
  budget: number
  bids: number
  status: string
}

const requirementData: Record<string, {
  id: string
  project: string
  status: string
  description: string
  startDate: string
  endDate: string
  budget: number
  items: RequirementItem[]
  suggestions: AISuggestion[]
  listings: Listing[]
}> = {
  "REQ-001": {
    id: "REQ-001",
    project: "Polymer Lab Testing Suite",
    status: "In Market",
    description: "Complete polymer testing requirements including lab access, specialist researchers, and testing equipment for the next-gen materials project.",
    startDate: "2026-01-15",
    endDate: "2026-06-30",
    budget: 85000,
    items: [
      { id: "item-1", title: "Senior Polymer Chemist", category: "Research Scientists", quantity: 1, duration: "3 months", budget: 35000, status: "Listed" },
      { id: "item-2", title: "Materials Testing Lab Access", category: "Lab Services", quantity: 1, duration: "4 months", budget: 18000, status: "Listed" },
      { id: "item-3", title: "Lab Technician - Sample Prep", category: "Lab Technicians", quantity: 2, duration: "2 months", budget: 12000, status: "Listed" },
      { id: "item-4", title: "Patent Filing Support", category: "IP / Patent Specialists", quantity: 1, duration: "1 month", budget: 8000, status: "Not Published" },
    ],
    suggestions: [
      { id: "sug-1", title: "QA Review Specialist", category: "Testing & QA", quantity: 1, duration: "1 month", estimatedCost: 6000, rationale: "Quality review for test results and compliance documentation." },
      { id: "sug-2", title: "Data Visualization Engineer", category: "Engineering Consultants", quantity: 1, duration: "2 weeks", estimatedCost: 4500, rationale: "Build dashboards for test result visualization and reporting." },
    ],
    listings: [
      { id: "LST-001", title: "Senior Polymer Chemist", category: "Research Scientists", budget: 35000, bids: 4, status: "Active" },
      { id: "LST-002", title: "Materials Testing Lab Access", category: "Lab Services", budget: 18000, bids: 2, status: "Active" },
      { id: "LST-003", title: "Lab Technician - Sample Prep", category: "Lab Technicians", budget: 12000, bids: 1, status: "Active" },
    ],
  },
}

const defaultReq = {
  id: "REQ-002",
  project: "AI Model Validation",
  status: "Published",
  description: "Validation testing for machine learning models in drug discovery pipeline.",
  startDate: "2026-02-01",
  endDate: "2026-05-15",
  budget: 42000,
  items: [
    { id: "item-1", title: "ML Validation Engineer", category: "Engineering Consultants", quantity: 1, duration: "2 months", budget: 28000, status: "Not Published" },
    { id: "item-2", title: "Biostatistician", category: "Research Scientists", quantity: 1, duration: "1 month", budget: 14000, status: "Not Published" },
  ],
  suggestions: [],
  listings: [],
}

export default function RequirementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const req = requirementData[id] || { ...defaultReq, id }

  const currentStepIndex = statusSteps.indexOf(req.status)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/marketplace/requirements"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{req.project}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[req.status]}`}>
              {req.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{req.id}</p>
        </div>
        {req.status === "Draft" || req.status === "Published" ? (
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
            <Send className="h-4 w-4" /> Publish All Items
          </button>
        ) : null}
      </div>

      {/* Overview Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Overview</h3>
        <p className="text-sm text-slate-600 mb-4">{req.description}</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Start Date</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{fmtDate(req.startDate)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">End Date</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{fmtDate(req.endDate)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Budget</p>
            <p className="mt-1 text-sm font-bold text-slate-900">${req.budget.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Items</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{req.items.length}</p>
          </div>
        </div>

        {/* Status Stepper */}
        <div>
          <p className="text-xs font-medium uppercase text-slate-400 mb-3">Progress</p>
          <div className="flex items-center gap-2">
            {statusSteps.map((step, index) => {
              const isCompleted = index < currentStepIndex
              const isCurrent = index === currentStepIndex
              return (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        isCompleted
                          ? "bg-indigo-600 text-white"
                          : isCurrent
                          ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className={`mt-1 text-xs font-medium ${isCurrent ? "text-indigo-700" : isCompleted ? "text-slate-700" : "text-slate-400"}`}>
                      {step}
                    </span>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div className={`h-0.5 flex-1 ${index < currentStepIndex ? "bg-indigo-600" : "bg-slate-200"}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Requirement Items</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3 text-right">Budget</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {req.items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.title}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[item.category] || "bg-slate-100 text-slate-700"}`}>
                    {item.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-600">{item.quantity}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.duration}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">${item.budget.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || "bg-slate-100 text-slate-600"}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {item.status === "Not Published" && (
                    <button className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                      <ShoppingCart className="h-3.5 w-3.5" /> Publish to Market
                    </button>
                  )}
                  {item.status === "Listed" && (
                    <span className="text-xs text-emerald-600 font-medium">Live</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Suggestions */}
      {req.suggestions.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 p-4 border-b border-purple-100 bg-purple-50 rounded-t-xl">
            <Lightbulb className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-900">AI Suggestions</h3>
            <span className="ml-auto text-xs text-purple-600">{req.suggestions.length} suggestions</span>
          </div>
          <div className="divide-y divide-purple-100">
            {req.suggestions.map((suggestion) => (
              <div key={suggestion.id} className="p-4 hover:bg-purple-50/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-slate-900">{suggestion.title}</h4>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[suggestion.category] || "bg-slate-100 text-slate-700"}`}>
                        <Tag className="h-3 w-3 mr-1" /> {suggestion.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{suggestion.rationale}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Qty: {suggestion.quantity}</span>
                      <span>{suggestion.duration}</span>
                      <span className="font-medium text-slate-700">${suggestion.estimatedCost.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                      <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listings */}
      {req.listings.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Published Listings</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {req.listings.map((listing) => (
              <div key={listing.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                <div>
                  <Link href={`/marketplace/listings/${listing.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    {listing.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[listing.category] || "bg-slate-100 text-slate-700"}`}>
                      {listing.category}
                    </span>
                    <span className="text-xs text-slate-500">${listing.budget.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{listing.bids}</p>
                    <p className="text-xs text-slate-500">bids</p>
                  </div>
                  <Link
                    href={`/marketplace/listings/${listing.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
