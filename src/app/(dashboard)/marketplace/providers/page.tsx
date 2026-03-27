"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Search,
  MapPin,
  Star,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
} from "lucide-react"

interface Provider {
  id: string
  name: string
  business: string
  category: string
  rating: number
  reviewCount: number
  location: string
  hourlyRate: number
  dailyRate: number
  verified: boolean
  available: boolean
  specialties: string[]
}

const allProviders: Provider[] = [
  { id: "prov-001", name: "Dr. Sarah Chen", business: "LabCorp Sciences", category: "Research Scientists", rating: 4.9, reviewCount: 47, location: "Sydney, NSW", hourlyRate: 250, dailyRate: 1800, verified: true, available: true, specialties: ["Polymer Chemistry", "Materials Testing"] },
  { id: "prov-002", name: "James Rodriguez", business: "IP Protect Ltd", category: "IP / Patent Specialists", rating: 4.7, reviewCount: 32, location: "Melbourne, VIC", hourlyRate: 320, dailyRate: 2400, verified: true, available: true, specialties: ["Patent Filing", "IP Strategy"] },
  { id: "prov-003", name: "Dr. Emily Watson", business: "BioAssay Labs", category: "Lab Technicians", rating: 4.8, reviewCount: 28, location: "Brisbane, QLD", hourlyRate: 180, dailyRate: 1300, verified: true, available: false, specialties: ["Bioassays", "Cell Culture"] },
  { id: "prov-004", name: "Michael Park", business: "DataForge Analytics", category: "Engineering Consultants", rating: 4.6, reviewCount: 53, location: "Perth, WA", hourlyRate: 280, dailyRate: 2100, verified: true, available: true, specialties: ["Data Pipelines", "ML Engineering"] },
  { id: "prov-005", name: "Lisa Thompson", business: "QualityFirst Testing", category: "Testing & QA", rating: 4.5, reviewCount: 19, location: "Adelaide, SA", hourlyRate: 200, dailyRate: 1500, verified: false, available: true, specialties: ["Environmental Testing", "Compliance Audits"] },
  { id: "prov-006", name: "Dr. Alex Kumar", business: "NanoTech Research", category: "Research Scientists", rating: 5.0, reviewCount: 15, location: "Sydney, NSW", hourlyRate: 350, dailyRate: 2600, verified: true, available: true, specialties: ["Nanotechnology", "Surface Analysis"] },
  { id: "prov-007", name: "Rachel Kim", business: "BioPharm Consulting", category: "Research Scientists", rating: 4.4, reviewCount: 22, location: "Melbourne, VIC", hourlyRate: 270, dailyRate: 2000, verified: true, available: true, specialties: ["Drug Discovery", "Pharmacology"] },
  { id: "prov-008", name: "Tom Wright", business: "Wright Engineering", category: "Engineering Consultants", rating: 4.3, reviewCount: 41, location: "Canberra, ACT", hourlyRate: 220, dailyRate: 1600, verified: false, available: true, specialties: ["Mechanical Design", "Prototyping"] },
  { id: "prov-009", name: "Dr. Priya Sharma", business: "EnviroTest Solutions", category: "Testing & QA", rating: 4.8, reviewCount: 36, location: "Sydney, NSW", hourlyRate: 240, dailyRate: 1800, verified: true, available: false, specialties: ["Environmental Impact", "Soil Analysis"] },
]

const categories = ["All", "Research Scientists", "Lab Technicians", "Engineering Consultants", "IP / Patent Specialists", "Testing & QA", "Project Managers"]
const locations = ["All", "Sydney, NSW", "Melbourne, VIC", "Brisbane, QLD", "Perth, WA", "Adelaide, SA", "Canberra, ACT"]
const ratingOptions = ["All", "4.5+", "4.0+", "3.5+"]
const availabilityOptions = ["All", "Available Now", "Unavailable"]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300"
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-slate-700">{rating.toFixed(1)}</span>
    </div>
  )
}

const ITEMS_PER_PAGE = 6

export default function ProvidersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedLocation, setSelectedLocation] = useState("All")
  const [selectedRating, setSelectedRating] = useState("All")
  const [selectedAvailability, setSelectedAvailability] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = allProviders.filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.business.toLowerCase().includes(searchQuery.toLowerCase()) && !p.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))) return false
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false
    if (selectedLocation !== "All" && p.location !== selectedLocation) return false
    if (selectedRating === "4.5+" && p.rating < 4.5) return false
    if (selectedRating === "4.0+" && p.rating < 4.0) return false
    if (selectedRating === "3.5+" && p.rating < 3.5) return false
    if (selectedAvailability === "Available Now" && !p.available) return false
    if (selectedAvailability === "Unavailable" && p.available) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Provider Directory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse verified R&D specialists and service providers
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          {filtered.length} providers
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search providers by name, business, or specialty..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1) }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
          >
            {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
          </select>
          <select
            value={selectedLocation}
            onChange={(e) => { setSelectedLocation(e.target.value); setCurrentPage(1) }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
          >
            {locations.map((l) => <option key={l} value={l}>{l === "All" ? "All Locations" : l}</option>)}
          </select>
          <select
            value={selectedRating}
            onChange={(e) => { setSelectedRating(e.target.value); setCurrentPage(1) }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
          >
            {ratingOptions.map((r) => <option key={r} value={r}>{r === "All" ? "All Ratings" : r}</option>)}
          </select>
          <select
            value={selectedAvailability}
            onChange={(e) => { setSelectedAvailability(e.target.value); setCurrentPage(1) }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
          >
            {availabilityOptions.map((a) => <option key={a} value={a}>{a === "All" ? "All Availability" : a}</option>)}
          </select>
        </div>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginated.map((provider) => (
          <div
            key={provider.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{provider.name}</h3>
                  {provider.verified && (
                    <BadgeCheck className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <p className="text-xs text-slate-500">{provider.business}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${provider.available ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {provider.available ? "Available" : "Busy"}
              </span>
            </div>

            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 mb-3">
              {provider.category}
            </span>

            <div className="mb-3">
              <StarRating rating={provider.rating} />
              <span className="text-xs text-slate-400 ml-1">({provider.reviewCount} reviews)</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
              <MapPin className="h-3 w-3" />
              {provider.location}
            </div>

            <div className="flex items-center gap-3 mb-4 text-xs text-slate-600">
              <span className="font-medium">${provider.hourlyRate}/hr</span>
              <span className="text-slate-300">|</span>
              <span className="font-medium">${provider.dailyRate}/day</span>
            </div>

            <div className="flex flex-wrap gap-1 mb-4">
              {provider.specialties.map((s) => (
                <span key={s} className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {s}
                </span>
              ))}
            </div>

            <Link
              href={`/marketplace/providers/${provider.id}`}
              className="block w-full rounded-lg bg-indigo-600 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              View Profile
            </Link>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No providers match your filters</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}--{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${page === currentPage ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
