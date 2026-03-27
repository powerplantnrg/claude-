"use client"

import { useState } from "react"
import Link from "next/link"
import {
  FileText,
  Sparkles,
  Plus,
  Check,
  X,
  Pencil,
  ChevronLeft,
  Loader2,
  Lightbulb,
  DollarSign,
  Clock,
  Tag,
  Trash2,
} from "lucide-react"

interface Suggestion {
  id: string
  title: string
  category: string
  quantity: number
  duration: string
  estimatedCost: number
  rationale: string
  alternatives: string[]
  status: "pending" | "accepted" | "rejected" | "modified"
}

interface RequirementItem {
  title: string
  category: string
  quantity: number
  duration: string
  budget: number
}

const categoryOptions = [
  "Research Scientists",
  "Lab Technicians",
  "Engineering Consultants",
  "IP / Patent Specialists",
  "Testing & QA",
  "Project Managers",
  "Equipment Rental",
  "Lab Services",
]

const categoryColors: Record<string, string> = {
  "Research Scientists": "bg-indigo-100 text-indigo-700",
  "Lab Technicians": "bg-emerald-100 text-emerald-700",
  "Engineering Consultants": "bg-blue-100 text-blue-700",
  "IP / Patent Specialists": "bg-amber-100 text-amber-700",
  "Testing & QA": "bg-purple-100 text-purple-700",
  "Project Managers": "bg-rose-100 text-rose-700",
  "Equipment Rental": "bg-cyan-100 text-cyan-700",
  "Lab Services": "bg-teal-100 text-teal-700",
}

const mockProjects = [
  { id: "proj-001", name: "Next-Gen Polymer Research" },
  { id: "proj-002", name: "AI Drug Discovery Platform" },
  { id: "proj-003", name: "Battery Cell Optimization" },
  { id: "proj-004", name: "Environmental Sensors R&D" },
]

const mockSuggestions: Suggestion[] = [
  {
    id: "sug-1",
    title: "Senior Polymer Chemist",
    category: "Research Scientists",
    quantity: 1,
    duration: "3 months",
    estimatedCost: 45000,
    rationale: "Design document references advanced polymer synthesis requiring PhD-level expertise in polymer chemistry.",
    alternatives: ["Contract research organization", "University partnership"],
    status: "pending",
  },
  {
    id: "sug-2",
    title: "Materials Testing Lab Access",
    category: "Lab Services",
    quantity: 1,
    duration: "4 months",
    estimatedCost: 18000,
    rationale: "Tensile strength and thermal analysis testing described in methodology section requires certified lab facilities.",
    alternatives: ["Mobile testing unit", "In-house equipment purchase"],
    status: "pending",
  },
  {
    id: "sug-3",
    title: "Lab Technician - Sample Preparation",
    category: "Lab Technicians",
    quantity: 2,
    duration: "2 months",
    estimatedCost: 12000,
    rationale: "High sample throughput (200+ samples) described in testing protocol requires dedicated preparation staff.",
    alternatives: ["Automated sample prep equipment"],
    status: "pending",
  },
  {
    id: "sug-4",
    title: "Patent Filing Support",
    category: "IP / Patent Specialists",
    quantity: 1,
    duration: "1 month",
    estimatedCost: 8000,
    rationale: "Novel material composition described in document is likely patentable. Early IP protection recommended.",
    alternatives: ["Defer to post-research phase", "Internal IP team review"],
    status: "pending",
  },
  {
    id: "sug-5",
    title: "Data Analysis Engineer",
    category: "Engineering Consultants",
    quantity: 1,
    duration: "2 months",
    estimatedCost: 22000,
    rationale: "Statistical analysis requirements and ML model fitting described in analysis section need specialized expertise.",
    alternatives: ["Cloud-based analysis platform subscription"],
    status: "pending",
  },
]

export default function NewRequirementPage() {
  const [mode, setMode] = useState<"select" | "manual" | "extract">("select")
  const [projectName, setProjectName] = useState("")
  const [linkedProject, setLinkedProject] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [budget, setBudget] = useState("")
  const [manualItems, setManualItems] = useState<RequirementItem[]>([])

  const [designDoc, setDesignDoc] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleExtract = () => {
    setExtracting(true)
    setTimeout(() => {
      setSuggestions(mockSuggestions)
      setShowSuggestions(true)
      setExtracting(false)
    }, 2000)
  }

  const updateSuggestionStatus = (id: string, status: Suggestion["status"]) => {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
  }

  const addManualItem = () => {
    setManualItems((prev) => [
      ...prev,
      { title: "", category: "Research Scientists", quantity: 1, duration: "", budget: 0 },
    ])
  }

  const updateManualItem = (index: number, field: keyof RequirementItem, value: string | number) => {
    setManualItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const removeManualItem = (index: number) => {
    setManualItems((prev) => prev.filter((_, i) => i !== index))
  }

  const acceptedSuggestions = suggestions.filter((s) => s.status === "accepted" || s.status === "modified")
  const totalFromSuggestions = acceptedSuggestions.reduce((sum, s) => sum + s.estimatedCost, 0)
  const totalFromManual = manualItems.reduce((sum, item) => sum + item.budget, 0)
  const grandTotal = totalFromSuggestions + totalFromManual

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/marketplace/requirements"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Create Requirement</h1>
          <p className="mt-1 text-sm text-slate-500">
            Define your R&D project needs manually or extract from a design document
          </p>
        </div>
      </div>

      {/* Mode Selection */}
      {mode === "select" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setMode("manual")}
            className="group rounded-xl border-2 border-slate-200 bg-white p-6 text-left shadow-sm hover:border-indigo-400 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700">Manual Entry</h2>
                <p className="text-sm text-slate-500">Define requirements item by item</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Manually specify each requirement item with category, quantity, duration, and budget.
            </p>
          </button>

          <button
            onClick={() => setMode("extract")}
            className="group rounded-xl border-2 border-purple-200 bg-white p-6 text-left shadow-sm hover:border-purple-400 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 group-hover:text-purple-700">Design Document Extract</h2>
                <p className="text-sm text-slate-500">AI-powered requirement extraction</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Paste or upload a design document and let AI suggest requirements with categories and costs.
            </p>
          </button>
        </div>
      )}

      {/* Manual Entry Form */}
      {mode === "manual" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Polymer Lab Testing Suite"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link to R&D Project</label>
                <select
                  value={linkedProject}
                  onChange={(e) => setLinkedProject(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select a project...</option>
                  {mockProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your requirement..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Budget</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>

          {/* Requirement Items */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Requirement Items</h3>
              <button
                onClick={addManualItem}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </div>

            {manualItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No items added yet. Click &quot;Add Item&quot; to define your requirements.
              </div>
            ) : (
              <div className="space-y-4">
                {manualItems.map((item, index) => (
                  <div key={index} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-medium text-slate-400">Item #{index + 1}</span>
                      <button onClick={() => removeManualItem(index)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateManualItem(index, "title", e.target.value)}
                          placeholder="e.g., Senior Lab Technician"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                        <select
                          value={item.category}
                          onChange={(e) => updateManualItem(index, "category", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                        >
                          {categoryOptions.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-2 lg:col-span-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateManualItem(index, "quantity", parseInt(e.target.value) || 1)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Duration</label>
                          <input
                            type="text"
                            value={item.duration}
                            onChange={(e) => updateManualItem(index, "duration", e.target.value)}
                            placeholder="e.g., 3 months"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Budget ($)</label>
                          <input
                            type="number"
                            value={item.budget || ""}
                            onChange={(e) => updateManualItem(index, "budget", parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {manualItems.length > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-700">Total Budget from Items</span>
                <span className="text-lg font-bold text-slate-900">${totalFromManual.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setMode("select")}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
              Save as Draft
            </button>
          </div>
        </div>
      )}

      {/* Design Document Extract */}
      {mode === "extract" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Paste Design Document</h3>
            <p className="text-sm text-slate-500 mb-4">
              Paste your design document text below and our AI will analyze it to suggest requirements, categories, and estimated costs.
            </p>
            <textarea
              value={designDoc}
              onChange={(e) => setDesignDoc(e.target.value)}
              rows={10}
              placeholder="Paste your design document text here..."
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-mono"
            />
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setMode("select")}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExtract}
                disabled={!designDoc.trim() || extracting}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Extract Requirements
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Suggestions */}
          {showSuggestions && (
            <div className="space-y-6">
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-purple-900">AI Suggestions</h3>
                </div>
                <p className="text-sm text-purple-700">
                  {suggestions.length} requirements were extracted from your document. Review each suggestion and accept, modify, or reject.
                </p>
              </div>

              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`rounded-xl border p-5 shadow-sm transition-all ${
                    suggestion.status === "accepted"
                      ? "border-emerald-200 bg-emerald-50"
                      : suggestion.status === "rejected"
                      ? "border-red-200 bg-red-50 opacity-60"
                      : suggestion.status === "modified"
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{suggestion.title}</h4>
                      <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[suggestion.category] || "bg-slate-100 text-slate-700"}`}>
                        <Tag className="h-3 w-3 mr-1" /> {suggestion.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {suggestion.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateSuggestionStatus(suggestion.id, "accepted")}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            <Check className="h-3.5 w-3.5" /> Accept
                          </button>
                          <button
                            onClick={() => updateSuggestionStatus(suggestion.id, "modified")}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Modify
                          </button>
                          <button
                            onClick={() => updateSuggestionStatus(suggestion.id, "rejected")}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      )}
                      {suggestion.status !== "pending" && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          suggestion.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                          suggestion.status === "rejected" ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="text-xs font-medium text-slate-400">Qty:</span> {suggestion.quantity}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> {suggestion.duration}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <DollarSign className="h-3.5 w-3.5 text-slate-400" /> ${suggestion.estimatedCost.toLocaleString()}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-400 mb-1">Rationale</p>
                    <p className="text-sm text-slate-600">{suggestion.rationale}</p>
                  </div>

                  {suggestion.alternatives.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 mb-1">Alternatives</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestion.alternatives.map((alt) => (
                          <span key={alt} className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Summary */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">Accepted Items</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-600">{acceptedSuggestions.length}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">Rejected</p>
                    <p className="mt-1 text-2xl font-bold text-red-600">{suggestions.filter((s) => s.status === "rejected").length}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">Total Budget</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">${grandTotal.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Save as Draft
                  </button>
                  <button
                    disabled={acceptedSuggestions.length === 0}
                    className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Requirement
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
