import { prisma } from "@/lib/prisma"

export interface Recommendation {
  id: string
  category: "Compliance" | "Financial" | "Technical" | "Deadline"
  priority: "high" | "medium" | "low"
  title: string
  description: string
  actionUrl: string
  impact: string
}

interface RdData {
  organizationId: string
}

export async function generateRecommendations(
  data: RdData
): Promise<Recommendation[]> {
  const orgId = data.organizationId
  const recommendations: Recommendation[] = []

  const [projects, expenses, experiments, claimDrafts, cloudCosts] =
    await Promise.all([
      prisma.rdProject.findMany({
        where: { organizationId: orgId },
        include: {
          activities: {
            include: {
              experiments: {
                include: { outcomes: true },
              },
              evidence: true,
              timeEntries: true,
              rdExpenses: true,
            },
          },
          rdExpenses: true,
          complianceChecklist: true,
          portfolioEntry: true,
          claimDrafts: true,
        },
      }),
      prisma.rdExpense.findMany({
        where: { rdProject: { organizationId: orgId } },
      }),
      prisma.experiment.findMany({
        where: {
          rdActivity: { rdProject: { organizationId: orgId } },
        },
        include: { outcomes: true },
      }),
      prisma.rdClaimDraft.findMany({
        where: { rdProject: { organizationId: orgId } },
      }),
      prisma.cloudCostEntry.findMany({
        where: { provider: { organizationId: orgId } },
        orderBy: { date: "desc" },
      }),
    ])

  let recId = 0
  const nextId = () => `rec-${++recId}`

  // Rule 1: Undocumented Activities
  for (const project of projects) {
    for (const activity of project.activities) {
      if (activity.timeEntries.length > 0 && activity.evidence.length === 0) {
        recommendations.push({
          id: nextId(),
          category: "Compliance",
          priority: "high",
          title: `Add documentation for "${activity.name}"`,
          description: `Add contemporaneous documentation to "${activity.name}" to strengthen ATO compliance. This activity has ${activity.timeEntries.length} time entries but no evidence uploads.`,
          actionUrl: `/rd/projects/${project.id}/evidence`,
          impact:
            "Missing documentation may weaken R&D tax incentive claims during ATO review.",
        })
      }
    }
  }

  // Rule 2: Unclassified Expenses
  const needsReviewExpenses = expenses.filter(
    (e) => e.classification === "NeedsReview"
  )
  if (needsReviewExpenses.length > 0) {
    recommendations.push({
      id: nextId(),
      category: "Financial",
      priority: "medium",
      title: `Review and classify ${needsReviewExpenses.length} expenses`,
      description: `Review and classify ${needsReviewExpenses.length} expenses for R&D eligibility. Unclassified expenses cannot be included in R&D tax incentive claims.`,
      actionUrl: "/rd/projects",
      impact:
        "Unclassified expenses may result in missed eligible R&D expenditure.",
    })
  }

  // Rule 3: Missing Hypotheses
  for (const project of projects) {
    for (const activity of project.activities) {
      if (activity.activityType === "Core" && !activity.hypothesis) {
        recommendations.push({
          id: nextId(),
          category: "Technical",
          priority: "high",
          title: `Document hypothesis for "${activity.name}"`,
          description: `Document the hypothesis for "${activity.name}" before continuing experimental work. Core R&D activities require a clearly stated hypothesis.`,
          actionUrl: `/rd/projects/${project.id}/activities`,
          impact:
            "A missing hypothesis may disqualify this activity as Core R&D under ATO guidelines.",
        })
      }
    }
  }

  // Rule 4: Budget Overrun
  for (const project of projects) {
    if (project.budget && project.budget > 0 && project.portfolioEntry?.actualSpend) {
      const spendPct =
        (project.portfolioEntry.actualSpend / project.budget) * 100
      if (spendPct > 90) {
        recommendations.push({
          id: nextId(),
          category: "Financial",
          priority: "high",
          title: `Project "${project.name}" at ${Math.round(spendPct)}% of budget`,
          description: `Project "${project.name}" is at ${Math.round(spendPct)}% of budget - consider revising budget or scope.`,
          actionUrl: `/rd/projects/${project.id}`,
          impact:
            "Budget overruns may require project scope adjustments or additional funding approval.",
        })
      }
    }
  }

  // Rule 5: Stale Experiments
  const now = new Date()
  for (const experiment of experiments) {
    if (experiment.status === "Running" && experiment.startDate) {
      const daysSinceStart = Math.floor(
        (now.getTime() - new Date(experiment.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      if (daysSinceStart > 90) {
        recommendations.push({
          id: nextId(),
          category: "Technical",
          priority: "medium",
          title: `Experiment "${experiment.name}" running for ${daysSinceStart} days`,
          description: `Experiment "${experiment.name}" has been running for ${daysSinceStart} days - review progress and consider whether it should be completed or adjusted.`,
          actionUrl: "/rd/experiments",
          impact:
            "Long-running experiments may indicate stalled progress or unclear success criteria.",
        })
      }
    }
  }

  // Rule 6: Incomplete Compliance
  for (const project of projects) {
    const checklist = project.complianceChecklist
    if (checklist.length > 0) {
      const completedCount = checklist.filter((c) => c.completed).length
      const pct = Math.round((completedCount / checklist.length) * 100)
      if (pct < 50) {
        recommendations.push({
          id: nextId(),
          category: "Compliance",
          priority: "high",
          title: `Complete compliance checklist for "${project.name}"`,
          description: `Complete compliance checklist for "${project.name}" - currently at ${pct}%. ${completedCount} of ${checklist.length} items completed.`,
          actionUrl: "/rd/compliance",
          impact:
            "Incomplete compliance documentation increases risk during ATO audit.",
        })
      }
    }
  }

  // Rule 7: Claim Optimization
  const totalEligibleSpend = expenses.filter(
    (e) => e.classification === "Eligible"
  ).length
  if (totalEligibleSpend > 0 && claimDrafts.length === 0) {
    const currentYear = now.getFullYear()
    const fyYear = now.getMonth() >= 6 ? currentYear + 1 : currentYear
    recommendations.push({
      id: nextId(),
      category: "Financial",
      priority: "medium",
      title: `Generate R&D Tax Incentive claim draft for FY ${fyYear}`,
      description: `Generate an R&D Tax Incentive claim draft for FY ${fyYear}. You have eligible R&D expenditure but no claim draft has been created.`,
      actionUrl: "/rd/claims",
      impact:
        "Failing to lodge an R&D claim means missing out on tax offset benefits.",
    })
  }

  // Rule 8: High Cloud Costs
  if (cloudCosts.length > 0) {
    const costsByMonth = new Map<string, number>()
    for (const cost of cloudCosts) {
      const d = new Date(cost.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      costsByMonth.set(key, (costsByMonth.get(key) || 0) + cost.amount)
    }
    const sortedMonths = Array.from(costsByMonth.entries()).sort(
      (a, b) => b[0].localeCompare(a[0])
    )
    if (sortedMonths.length >= 2) {
      const [currentMonth, currentTotal] = sortedMonths[0]
      const [, priorTotal] = sortedMonths[1]
      if (priorTotal > 0) {
        const pctChange = ((currentTotal - priorTotal) / priorTotal) * 100
        if (pctChange > 20) {
          recommendations.push({
            id: nextId(),
            category: "Financial",
            priority: "medium",
            title: `Cloud costs increased ${Math.round(pctChange)}% this month`,
            description: `Cloud costs increased ${Math.round(pctChange)}% this month (${currentMonth}) - review for optimization opportunities.`,
            actionUrl: "/cloud",
            impact:
              "Rising cloud costs reduce project margins and may indicate inefficient resource usage.",
          })
        }
      }
    }
  }

  // Rule 9: Missing Outcomes
  const completedNoOutcomes = experiments.filter(
    (e) => e.status === "Completed" && e.outcomes.length === 0 && !e.outcome
  )
  if (completedNoOutcomes.length > 0) {
    recommendations.push({
      id: nextId(),
      category: "Technical",
      priority: "medium",
      title: `Record outcomes for ${completedNoOutcomes.length} completed experiments`,
      description: `Record outcomes for ${completedNoOutcomes.length} completed experiments. Documenting outcomes is essential for R&D record-keeping and future planning.`,
      actionUrl: "/rd/experiments",
      impact:
        "Missing experiment outcomes weaken the evidence base for R&D claims.",
    })
  }

  // Rule 10: Registration Deadline
  const currentMonth = now.getMonth() // 0-indexed, June = 5
  const currentYear = now.getFullYear()
  // Australian FY ends June 30. Within 4 months = March-June (months 2-5)
  if (currentMonth >= 2 && currentMonth <= 5) {
    const fyYear = currentYear
    const hasSubmittedClaim = claimDrafts.some(
      (c) =>
        c.financialYear === String(fyYear) && c.status === "Submitted"
    )
    if (!hasSubmittedClaim) {
      recommendations.push({
        id: nextId(),
        category: "Deadline",
        priority: "high",
        title: `AusIndustry R&D registration deadline approaching for FY ${fyYear}`,
        description: `AusIndustry R&D registration deadline approaching for FY ${fyYear}. Registration must be submitted within 10 months of the end of the financial year.`,
        actionUrl: "/rd/claims",
        impact:
          "Missing the registration deadline means forfeiting R&D tax incentive benefits for the entire financial year.",
      })
    }
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  }
  recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  )

  return recommendations
}
