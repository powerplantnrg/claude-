import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { generateRecommendations } from "@/lib/rd-recommendations"
import type { Recommendation } from "@/lib/rd-recommendations"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "R&D Recommendations",
}

const categoryIcons: Record<string, string> = {
  Compliance: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  Financial: "M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  Technical: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5",
  Deadline: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
}

const priorityStyles: Record<string, { badge: string; border: string }> = {
  high: {
    badge: "bg-red-100 text-red-700",
    border: "border-l-red-500",
  },
  medium: {
    badge: "bg-amber-100 text-amber-700",
    border: "border-l-amber-500",
  },
  low: {
    badge: "bg-blue-100 text-blue-700",
    border: "border-l-blue-500",
  },
}

const categoryColors: Record<string, string> = {
  Compliance: "text-indigo-600 bg-indigo-100",
  Financial: "text-green-600 bg-green-100",
  Technical: "text-violet-600 bg-violet-100",
  Deadline: "text-red-600 bg-red-100",
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const pStyle = priorityStyles[rec.priority] || priorityStyles.low
  const catColor = categoryColors[rec.category] || "text-slate-600 bg-slate-100"
  const iconPath = categoryIcons[rec.category] || categoryIcons.Technical

  return (
    <div
      className={`rounded-lg border border-slate-200 border-l-4 ${pStyle.border} bg-white p-4`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${catColor}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={iconPath}
              />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pStyle.badge}`}
              >
                {rec.priority}
              </span>
              <span className="text-xs text-slate-400">{rec.category}</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {rec.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{rec.description}</p>
            <p className="mt-1 text-xs text-slate-400">
              Impact: {rec.impact}
            </p>
          </div>
        </div>
        <Link
          href={rec.actionUrl}
          className="shrink-0 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          Take Action
        </Link>
      </div>
    </div>
  )
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const allRecommendations = await generateRecommendations({
    organizationId: orgId,
  })

  const params = await searchParams
  const filterCategory = params.category || "all"
  const recommendations =
    filterCategory === "all"
      ? allRecommendations
      : allRecommendations.filter((r) => r.category === filterCategory)

  const highCount = allRecommendations.filter(
    (r) => r.priority === "high"
  ).length
  const mediumCount = allRecommendations.filter(
    (r) => r.priority === "medium"
  ).length
  const lowCount = allRecommendations.filter(
    (r) => r.priority === "low"
  ).length

  const highRecs = recommendations.filter((r) => r.priority === "high")
  const mediumRecs = recommendations.filter((r) => r.priority === "medium")
  const lowRecs = recommendations.filter((r) => r.priority === "low")

  const categories = ["all", "Compliance", "Financial", "Technical", "Deadline"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          R&D Recommendations
        </h1>
        <p className="text-sm text-slate-500">
          Actionable insights to optimize your R&D program and compliance
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-2xl font-bold text-slate-900">
            {allRecommendations.length}
          </p>
          <p className="text-xs text-slate-500">Total Recommendations</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-2xl font-bold text-red-700">{highCount}</p>
          <p className="text-xs text-red-600">High Priority</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-2xl font-bold text-amber-700">{mediumCount}</p>
          <p className="text-xs text-amber-600">Medium Priority</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-2xl font-bold text-blue-700">{lowCount}</p>
          <p className="text-xs text-blue-600">Low Priority</p>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2">
        {categories.map((cat) => (
          <Link
            key={cat}
            href={
              cat === "all"
                ? "/rd/recommendations"
                : `/rd/recommendations?category=${cat}`
            }
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filterCategory === cat
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat === "all" ? "All" : cat}
          </Link>
        ))}
      </div>

      {recommendations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">
            No recommendations found. Your R&D program is in good shape!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {highRecs.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-600">
                High Priority ({highRecs.length})
              </h2>
              <div className="space-y-3">
                {highRecs.map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} />
                ))}
              </div>
            </div>
          )}

          {mediumRecs.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-600">
                Medium Priority ({mediumRecs.length})
              </h2>
              <div className="space-y-3">
                {mediumRecs.map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} />
                ))}
              </div>
            </div>
          )}

          {lowRecs.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-600">
                Low Priority ({lowRecs.length})
              </h2>
              <div className="space-y-3">
                {lowRecs.map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
