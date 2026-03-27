"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Search,
  MapPin,
  DollarSign,
  Clock,
  Eye,
  MessageSquare,
  Filter,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react"

interface Listing {
  id: string
  title: string
  description: string
  category: string
  budget: number
  budgetType: string
  location: string
  remoteOk: boolean
  duration: string
  status: string
  viewCount: number
  responseCount: number
  createdAt: string
}

const allListings: Listing[] = [
  { id: "lst-001", title: "Polymer Materials Testing Suite", description: "Comprehensive testing of novel polymer composites for automotive applications", category: "Research Scientists", budget: 85000, budgetType: "Fixed", location: "Sydney, NSW", remoteOk: false, duration: "12 weeks", status: "Open", viewCount: 142, responseCount: 7, createdAt: "2026-03-15" },
  { id: "lst-002", title: "AI Model Validation & Audit", description: "Independent validation of ML models for regulatory compliance", category: "Engineering Consultants", budget: 42000, budgetType: "Fixed", location: "Melbourne, VIC", remoteOk: true, duration: "8 weeks", status: "Open", viewCount: 98, responseCount: 3, createdAt: "2026-03-18" },
  { id: "lst-003", title: "Environmental Compliance Audit", description: "Full environmental impact assessment for new R&D facility", category: "Testing & QA", budget: 120000, budgetType: "Fixed", location: "Brisbane, QLD", remoteOk: false, duration: "16 weeks", status: "Open", viewCount: 67, responseCount: 5, createdAt: "2026-03-10" },
  { id: "lst-004", title: "Patent Portfolio Review", description: "Review and strategic analysis of existing patent portfolio for gap identification", category: "IP / Patent Specialists", budget: 280, budgetType: "Hourly", location: "Perth, WA", remoteOk: true, duration: "4 weeks", status: "Open", viewCount: 55, responseCount: 2, createdAt: "2026-03-20" },
  { id: "lst-005", title: "Cell Culture Lab Technician", description: "Experienced lab tech for ongoing cell culture and bioassay work", category: "Lab Technicians", budget: 180, budgetType: "Hourly", location: "Adelaide, SA", remoteOk: false, duration: "6 months", status: "Reviewing", viewCount: 201, responseCount: 11, createdAt: "2026-03-05" },
  { id: "lst-006", title: "Nanotechnology Surface Analysis", description: "Advanced surface characterisation using AFM and SEM for nanocoatings project", category: "Research Scientists", budget: 65000, budgetType: "Fixed", location: "Sydney, NSW", remoteOk: false, duration: "10 weeks", status: "Open", viewCount: 89, responseCount: 4, createdAt: "2026-03-22" },
  { id: "lst-007", title: "Mechanical Prototyping Support", description: "Design and fabrication of prototype mechanical assemblies for testing", category: "Engineering Consultants", budget: 2100, budgetType: "Daily", location: "Canberra, ACT", remoteOk: false, duration: "8 weeks", status: "Assigned", viewCount: 134, responseCount: 8, createdAt: "2026-02-28" },
  { id: "lst-008", title: "Drug Discovery Pharmacology Review", description: "Expert review of early-stage drug discovery data and pathway analysis", category: "Research Scientists", budget: 38000, budgetType: "Fixed", location: "Melbourne, VIC", remoteOk: true, duration: "6 weeks", status: "Open", viewCount: 76, responseCount: 2, createdAt: "2026-03-25" },
]

const categories = ["All", "Research Scientists", "Lab Technicians", "Engineering Consultants", "IP / Patent Specialists", "Testing & QA"]
const budgetRanges = ["All", "Under $10k", "$10k - $50k", "$50k - $100k", "Over $100k"]
const locations = ["All", "Sydney, NSW", "Melbourne, VIC", "Brisbane, QLD", "Perth, WA", "Adelaide, SA", "Canberra, ACT"]

const statusColors: Record<string, string> = {
  Open: "bg-emerald-100 text-emerald-700",
  Reviewing: "bg-blue-100 text-blue-700",
  Assigned: "bg-indigo-100 text-indigo-700",
  InProgress: "bg-amber-100 text-amber-700",
  Completed: "bg-slate-100 text-slate-600",
  Cancelled: "bg-red-100 text-red-700",
}

const ITEMS_PER_PAGE = 6

export default function ListingsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedBudget, setSelectedBudget] = useState("All")
  const [selectedLocation, setSelectedLocation] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = allListings.filter((l) => {
    if (searchQuery && !l.title.toLowerCase().includes(searchQuery.toLowerCase()) && !l.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (selectedCategory !== "All" && l.category !== selectedCategory) return false
    if (selectedLocation !== "All" && l.location !== selectedLocation) return false
    if (selectedBudget !== "All") {
      const budget = l.budgetType === "Fixed" ? l.budget : l.budget * 160
      if (selectedBudget === "Under $10k" && budget >= 10000) return false
      if (selectedBudget === "$10k - $50k" && (budget < 10000 || budget > 50000)) return false
      if (selectedBudget === "$50k - $100k" && (budget < 50000 || budget > 100000)) return false
      if (selectedBudget === "Over $100k" && budget < 100000) return false
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Marketplace Listings</h1>
        <p className="text-sm text-slate-500 mt-1">Browse and search active R&D service requirements</p>
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search listings by title or description..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1) }}
          >
            {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            value={selectedBudget}
            onChange={(e) => { setSelectedBudget(e.target.value); setCurrentPage(1) }}
          >
            {budgetRanges.map((b) => <option key={b} value={b}>{b === "All" ? "All Budgets" : b}</option>)}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            value={selectedLocation}
            onChange={(e) => { setSelectedLocation(e.target.value); setCurrentPage(1) }}
          >
            {locations.map((l) => <option key={l} value={l}>{l === "All" ? "All Locations" : l}</option>)}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-500">{filtered.length} listing{filtered.length !== 1 ? "s" : ""} found</p>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginated.map((listing) => (
          <Link
            key={listing.id}
            href={`/marketplace/listings/${listing.id}`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[listing.status] || "bg-slate-100 text-slate-700"}`}>
                {listing.status}
              </span>
              <span className="text-xs text-slate-400">{listing.createdAt}</span>
            </div>

            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 mb-2 line-clamp-2">
              {listing.title}
            </h3>
            <p className="text-xs text-slate-500 mb-4 line-clamp-2">{listing.description}</p>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span>{listing.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium text-slate-900">
                  ${listing.budget.toLocaleString()}
                  {listing.budgetType !== "Fixed" && <span className="text-slate-500"> / {listing.budgetType.toLowerCase()}</span>}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{listing.location}{listing.remoteOk && " (Remote OK)"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{listing.duration}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {listing.viewCount} views</span>
              <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {listing.responseCount} bids</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-slate-500">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
