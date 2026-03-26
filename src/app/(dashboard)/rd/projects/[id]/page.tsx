import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import AuditPackButton from "./AuditPackButton"

export default async function RdProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id } = await params

  const project = await prisma.rdProject.findFirst({
    where: { id, organizationId: orgId },
    include: {
      activities: {
        include: {
          experiments: true,
          timeEntries: true,
          evidence: true,
          _count: {
            select: { experiments: true, evidence: true, timeEntries: true },
          },
        },
      },
      rdExpenses: {
        include: {
          journalLine: {
            include: { account: true },
          },
        },
      },
      complianceChecklist: {
        orderBy: { category: "asc" },
      },
    },
  })

  if (!project) notFound()

  // Calculate totals
  const totalTimeHours = project.activities.reduce(
    (sum, a) => sum + a.timeEntries.reduce((s, t) => s + t.hours, 0),
    0
  )
  const totalTimeCost = project.activities.reduce(
    (sum, a) =>
      sum +
      a.timeEntries.reduce(
        (s, t) => s + t.hours * (t.hourlyRate || 0),
        0
      ),
    0
  )
  const totalExpenses = project.rdExpenses.reduce(
    (sum, e) => sum + (e.journalLine?.debit || 0),
    0
  )
  const totalExperiments = project.activities.reduce(
    (sum, a) => sum + a.experiments.length,
    0
  )
  const totalEvidence = project.activities.reduce(
    (sum, a) => sum + a.evidence.length,
    0
  )

  // Compliance checklist by category
  const checklistByCategory: Record<
    string,
    typeof project.complianceChecklist
  > = {}
  project.complianceChecklist.forEach((item) => {
    if (!checklistByCategory[item.category]) {
      checklistByCategory[item.category] = []
    }
    checklistByCategory[item.category].push(item)
  })
  const totalChecklist = project.complianceChecklist.length
  const completedChecklist = project.complianceChecklist.filter(
    (c) => c.completed
  ).length

  // Claim estimate (43.5% offset rate)
  const eligibleSpend = totalTimeCost + totalExpenses
  const offsetRate = 0.435
  const claimEstimate = eligibleSpend * offsetRate

  const tabs = [
    { name: "Activities", href: `/rd/projects/${id}/activities`, count: project.activities.length },
    { name: "Experiments", href: `/rd/projects/${id}/experiments`, count: totalExperiments },
    { name: "Evidence", href: `/rd/projects/${id}/evidence`, count: totalEvidence },
    { name: "Time Tracking", href: `/rd/projects/${id}/time`, count: null },
    { name: "Expenses", href: `/rd/projects/${id}/expenses`, count: project.rdExpenses.length },
  ]

  const eligibilityColor: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700",
    Eligible: "bg-green-100 text-green-700",
    Ineligible: "bg-red-100 text-red-700",
    PartiallyEligible: "bg-blue-100 text-blue-700",
  }

  const categoryIcon: Record<string, string> = {
    Documentation: "text-blue-600",
    Financial: "text-green-600",
    Technical: "text-violet-600",
    Registration: "text-amber-600",
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/rd" className="hover:text-indigo-600">
          R&D Intelligence
        </Link>
        <span>/</span>
        <Link href="/rd/projects" className="hover:text-indigo-600">
          Projects
        </Link>
        <span>/</span>
        <span className="text-slate-700">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {project.name}
            </h1>
            <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {project.status}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                eligibilityColor[project.eligibilityStatus] ||
                "bg-slate-100 text-slate-700"
              }`}
            >
              {project.eligibilityStatus}
            </span>
          </div>
          {project.description && (
            <p className="mt-1 text-sm text-slate-500">
              {project.description}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-400">
            Started {formatDate(project.startDate)}
            {project.endDate && ` \u2014 Ends ${formatDate(project.endDate)}`}
            {project.budget && ` \u00B7 Budget: ${formatCurrency(project.budget)}`}
          </p>
        </div>
        <AuditPackButton projectId={id} />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Time</p>
          <p className="text-xl font-bold text-slate-900">
            {totalTimeHours.toFixed(1)}h
          </p>
          <p className="text-xs text-slate-400">
            {formatCurrency(totalTimeCost)} cost
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Expenses</p>
          <p className="text-xl font-bold text-slate-900">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Eligible Spend</p>
          <p className="text-xl font-bold text-slate-900">
            {formatCurrency(eligibleSpend)}
          </p>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm text-indigo-600">R&D Claim Estimate</p>
          <p className="text-xl font-bold text-indigo-700">
            {formatCurrency(claimEstimate)}
          </p>
          <p className="text-xs text-indigo-400">
            at {(offsetRate * 100).toFixed(1)}% offset
          </p>
        </div>
      </div>

      {/* Tabbed Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
            >
              {tab.name}
              {tab.count !== null && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {tab.count}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* R&D Documentation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {project.coreActivityDescription && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                Core Activity Description
              </h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {project.coreActivityDescription}
              </p>
            </div>
          )}
          {project.hypothesisSummary && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                Hypothesis Summary
              </h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {project.hypothesisSummary}
              </p>
            </div>
          )}
          {project.technicalUncertainty && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                Technical Uncertainty
              </h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {project.technicalUncertainty}
              </p>
            </div>
          )}
          {project.newKnowledgeSought && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                New Knowledge Sought
              </h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {project.newKnowledgeSought}
              </p>
            </div>
          )}
        </div>

        {/* Compliance Checklist */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Compliance Checklist
            </h3>
            <span className="text-sm text-slate-500">
              {completedChecklist}/{totalChecklist} complete
            </span>
          </div>
          <div className="mb-4 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-indigo-600 transition-all"
              style={{
                width: `${
                  totalChecklist > 0
                    ? (completedChecklist / totalChecklist) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="space-y-4">
            {Object.entries(checklistByCategory).map(
              ([category, items]) => (
                <div key={category}>
                  <h4
                    className={`mb-2 text-xs font-semibold uppercase tracking-wider ${
                      categoryIcon[category] || "text-slate-500"
                    }`}
                  >
                    {category}
                  </h4>
                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        {item.completed ? (
                          <svg
                            className="h-4 w-4 text-green-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-4 w-4 text-slate-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                        <span
                          className={
                            item.completed
                              ? "text-slate-400 line-through"
                              : "text-slate-700"
                          }
                        >
                          {item.item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
