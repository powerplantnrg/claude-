import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowLeft,
  BadgeCheck,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Shield,
  Award,
  Calendar,
  MessageSquare,
  Send,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Provider Profile",
}

const provider = {
  id: "prov-001",
  name: "Dr. Sarah Chen",
  business: "LabCorp Sciences Pty Ltd",
  verified: true,
  rating: 4.9,
  reviewCount: 47,
  location: "Sydney, NSW",
  about:
    "Dr. Chen is a senior materials scientist with over 15 years of experience in polymer chemistry and advanced materials testing. She leads the R&D division at LabCorp Sciences and has contributed to 30+ peer-reviewed publications in the field of sustainable polymers. Her team specialises in accelerated aging tests, mechanical property characterisation, and environmental durability assessments.",
  qualifications: [
    "PhD in Polymer Chemistry, University of Sydney",
    "BSc (Hons) in Chemical Engineering, UNSW",
    "Chartered Chemist (CChem), Royal Australian Chemical Institute",
    "ISO 17025 Lead Assessor",
  ],
  insurance: {
    professionalIndemnity: "$5,000,000",
    publicLiability: "$20,000,000",
    workersComp: "Compliant",
  },
  capabilities: [
    { name: "Polymer Testing (ASTM/ISO)", verified: true },
    { name: "Materials Characterisation", verified: true },
    { name: "Accelerated Aging Studies", verified: true },
    { name: "Rheology & Viscosity Analysis", verified: false },
    { name: "Environmental Durability Testing", verified: true },
    { name: "Failure Analysis", verified: true },
    { name: "SEM/TEM Microscopy", verified: true },
    { name: "FTIR & Spectroscopic Analysis", verified: false },
  ],
  rates: {
    hourly: 250,
    daily: 1800,
    minimumEngagement: "2 days",
    leadTime: "1-2 weeks",
  },
  reviews: [
    { id: 1, author: "John M.", company: "TechCorp Pty Ltd", rating: 5, date: "2024-11-15", comment: "Outstanding work on our polymer degradation study. Delivered ahead of schedule with exceptional detail in the report." },
    { id: 2, author: "Maria L.", company: "GreenMaterials Co", rating: 5, date: "2024-10-02", comment: "Dr. Chen and her team provided exactly what we needed for our R&D tax claim evidence. Highly professional." },
    { id: 3, author: "David K.", company: "AeroDyne Industries", rating: 4, date: "2024-08-20", comment: "Very thorough testing methodology. Minor delays due to equipment scheduling but overall excellent results." },
    { id: 4, author: "Susan R.", company: "BioPlast Solutions", rating: 5, date: "2024-07-10", comment: "Best materials testing lab we have worked with. The team is knowledgeable and responsive." },
  ],
}

const ratingBreakdown = [
  { stars: 5, count: 38 },
  { stars: 4, count: 7 },
  { stars: 3, count: 2 },
  { stars: 2, count: 0 },
  { stars: 1, count: 0 },
]

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const iconSize = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5"
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconSize} ${
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300"
          }`}
        />
      ))}
    </div>
  )
}

export default async function ProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <Link
        href="/marketplace/providers"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Directory
      </Link>

      {/* Profile Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xl font-bold">
                {provider.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-slate-900">{provider.name}</h1>
                  {provider.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{provider.business}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <StarRating rating={provider.rating} size="lg" />
                <span className="text-lg font-semibold text-slate-900 ml-1">{provider.rating}</span>
                <span className="text-sm text-slate-500">({provider.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                {provider.location}
              </div>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
            <Send className="h-4 w-4" /> Invite to Listing
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">About</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{provider.about}</p>
          </div>

          {/* Qualifications */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Qualifications</h2>
            <ul className="space-y-2">
              {provider.qualifications.map((q) => (
                <li key={q} className="flex items-start gap-2 text-sm text-slate-600">
                  <Award className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                  {q}
                </li>
              ))}
            </ul>
          </div>

          {/* Capabilities */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Capabilities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {provider.capabilities.map((cap) => (
                <div
                  key={cap.name}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm text-slate-700">{cap.name}</span>
                  {cap.verified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Self-declared</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Insurance */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Insurance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500 mb-1">Professional Indemnity</p>
                <p className="text-sm font-semibold text-slate-900">{provider.insurance.professionalIndemnity}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500 mb-1">Public Liability</p>
                <p className="text-sm font-semibold text-slate-900">{provider.insurance.publicLiability}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500 mb-1">Workers Compensation</p>
                <p className="text-sm font-semibold text-slate-900">{provider.insurance.workersComp}</p>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Reviews</h2>

            {/* Rating Breakdown */}
            <div className="flex items-center gap-6 mb-6 p-4 rounded-lg bg-slate-50">
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">{provider.rating}</p>
                <StarRating rating={provider.rating} />
                <p className="text-xs text-slate-500 mt-1">{provider.reviewCount} reviews</p>
              </div>
              <div className="flex-1 space-y-1">
                {ratingBreakdown.map((r) => (
                  <div key={r.stars} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-3">{r.stars}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-amber-400 h-2 rounded-full"
                        style={{ width: `${(r.count / provider.reviewCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review List */}
            <div className="space-y-4">
              {provider.reviews.map((review) => (
                <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-slate-900">{review.author}</span>
                      <span className="text-xs text-slate-400 ml-2">{review.company}</span>
                    </div>
                    <span className="text-xs text-slate-400">{review.date}</span>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="text-sm text-slate-600 mt-2">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Rates */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sticky top-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Service Rates</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Hourly Rate
                </span>
                <span className="text-lg font-bold text-slate-900">${provider.rates.hourly}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Daily Rate
                </span>
                <span className="text-lg font-bold text-slate-900">${provider.rates.daily}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Min. Engagement</span>
                <span className="text-sm font-medium text-slate-700">{provider.rates.minimumEngagement}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Lead Time</span>
                <span className="text-sm font-medium text-slate-700">{provider.rates.leadTime}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                <Send className="h-4 w-4" /> Invite to Listing
              </button>
              <button className="w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" /> Contact Provider
              </button>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-700">
                <Shield className="h-4 w-4" />
                <p className="text-xs font-medium">Platform Protected</p>
              </div>
              <p className="text-xs text-emerald-600 mt-1">
                All contracts are protected by our escrow and milestone payment system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
