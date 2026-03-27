"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Clock,
  Eye,
  MessageSquare,
  Star,
  BadgeCheck,
  Send,
  Tag,
  Calendar,
  Globe,
} from "lucide-react"

interface Bid {
  id: string
  providerName: string
  providerBusiness: string
  rating: number
  reviewCount: number
  verified: boolean
  amount: number
  rateType: string
  proposedStart: string
  proposedEnd: string
  proposalDescription: string
  status: string
  submittedAt: string
}

const listing = {
  id: "lst-001",
  title: "Polymer Materials Testing Suite",
  description: "Comprehensive testing of novel polymer composites for automotive applications. Requires expertise in tensile strength analysis, thermal decomposition testing, and fatigue life evaluation. The ideal provider will have access to ISO-certified testing facilities and experience with automotive-grade polymers.",
  category: "Research Scientists",
  budget: 85000,
  budgetType: "Fixed",
  location: "Sydney, NSW",
  remoteOk: false,
  duration: "12 weeks",
  status: "Open",
  viewCount: 142,
  responseCount: 7,
  paymentTerms: "Milestone",
  startDate: "2026-04-15",
  endDate: "2026-07-08",
  createdAt: "2026-03-15",
}

const existingBids: Bid[] = [
  { id: "bid-001", providerName: "Dr. Sarah Chen", providerBusiness: "LabCorp Sciences", rating: 4.9, reviewCount: 47, verified: true, amount: 82000, rateType: "Fixed", proposedStart: "2026-04-15", proposedEnd: "2026-07-01", proposalDescription: "Full polymer testing suite including ISO 527, ISO 11357, and fatigue testing per ASTM D7791.", status: "Submitted", submittedAt: "2026-03-16" },
  { id: "bid-002", providerName: "Dr. Alex Kumar", providerBusiness: "NanoTech Research", rating: 5.0, reviewCount: 15, verified: true, amount: 91000, rateType: "Fixed", proposedStart: "2026-04-20", proposedEnd: "2026-07-10", proposalDescription: "Premium testing with advanced nano-characterisation included. Additional SEM surface analysis at no extra cost.", status: "Shortlisted", submittedAt: "2026-03-17" },
  { id: "bid-003", providerName: "Lisa Thompson", providerBusiness: "QualityFirst Testing", rating: 4.5, reviewCount: 19, verified: false, amount: 68000, rateType: "Fixed", proposedStart: "2026-05-01", proposedEnd: "2026-07-15", proposalDescription: "Comprehensive mechanical testing. Note: thermal analysis subcontracted to partner lab.", status: "Submitted", submittedAt: "2026-03-18" },
  { id: "bid-004", providerName: "Rachel Kim", providerBusiness: "BioPharm Consulting", rating: 4.4, reviewCount: 22, verified: true, amount: 79500, rateType: "Fixed", proposedStart: "2026-04-15", proposedEnd: "2026-06-28", proposalDescription: "Cross-disciplinary approach with polymer chemistry and pharmaceutical testing experience.", status: "Submitted", submittedAt: "2026-03-20" },
]

const statusColors: Record<string, string> = {
  Submitted: "bg-blue-100 text-blue-700",
  Shortlisted: "bg-indigo-100 text-indigo-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Withdrawn: "bg-slate-100 text-slate-600",
  Open: "bg-emerald-100 text-emerald-700",
}

export default function ListingDetailPage() {
  const [bidAmount, setBidAmount] = useState("")
  const [bidDescription, setBidDescription] = useState("")
  const [bidStart, setBidStart] = useState("")
  const [bidEnd, setBidEnd] = useState("")
  const [showBidForm, setShowBidForm] = useState(false)

  function handleSubmitBid(e: React.FormEvent) {
    e.preventDefault()
    // In a real app, this would call the API
    setShowBidForm(false)
    setBidAmount("")
    setBidDescription("")
    setBidStart("")
    setBidEnd("")
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/marketplace/listings" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Listings
      </Link>

      {/* Listing Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[listing.status]}`}>
            {listing.status}
          </span>
          <span className="text-xs text-slate-400">Posted {listing.createdAt}</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">{listing.title}</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{listing.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Tag className="h-4 w-4 text-slate-400" />
            <span>{listing.category}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-900">${listing.budget.toLocaleString()}</span>
            <span className="text-slate-500">{listing.budgetType}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{listing.location}{listing.remoteOk && " (Remote OK)"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>{listing.duration}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{listing.startDate} to {listing.endDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Globe className="h-4 w-4 text-slate-400" />
            <span>Payment: {listing.paymentTerms}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Eye className="h-4 w-4" />
            <span>{listing.viewCount} views</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MessageSquare className="h-4 w-4" />
            <span>{listing.responseCount} bids</span>
          </div>
        </div>
      </div>

      {/* Submit Bid */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Submit a Bid</h2>
          {!showBidForm && (
            <button
              onClick={() => setShowBidForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Send className="h-4 w-4" /> Place Bid
            </button>
          )}
        </div>

        {showBidForm && (
          <form onSubmit={handleSubmitBid} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bid Amount ($)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="85000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Proposed Start</label>
                <input
                  type="date"
                  value={bidStart}
                  onChange={(e) => setBidStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Proposed End</label>
                <input
                  type="date"
                  value={bidEnd}
                  onChange={(e) => setBidEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Description</label>
              <textarea
                required
                rows={4}
                value={bidDescription}
                onChange={(e) => setBidDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Describe your approach, qualifications, and what is included..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Send className="h-4 w-4" /> Submit Bid
              </button>
              <button
                type="button"
                onClick={() => setShowBidForm(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bids Comparison Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Bids ({existingBids.length})</h2>
          <p className="text-sm text-slate-500 mt-1">Compare proposals from specialist providers</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Rating</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3">Timeline</th>
                <th className="px-6 py-3">Proposal</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {existingBids.map((bid) => (
                <tr key={bid.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {bid.providerName}
                          {bid.verified && <BadgeCheck className="inline h-3.5 w-3.5 ml-1 text-blue-500" />}
                        </p>
                        <p className="text-xs text-slate-500">{bid.providerBusiness}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium text-slate-700">{bid.rating.toFixed(1)}</span>
                      <span className="text-xs text-slate-400">({bid.reviewCount})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-slate-900">${bid.amount.toLocaleString()}</span>
                    <p className="text-xs text-slate-500">{bid.rateType}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600">{bid.proposedStart}</p>
                    <p className="text-xs text-slate-400">to {bid.proposedEnd}</p>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-xs text-slate-600 line-clamp-2">{bid.proposalDescription}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[bid.status] || "bg-slate-100 text-slate-700"}`}>
                      {bid.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
