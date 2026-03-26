import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const projects = await prisma.rdProject.findMany({
    where: { organizationId: orgId },
    include: {
      portfolioEntry: true,
      rdExpenses: {
        include: {
          journalLine: true,
        },
      },
      activities: {
        include: {
          timeEntries: true,
        },
      },
    },
  })

  const portfolioData = projects.map((project) => {
    const budget = project.budget || 0

    // Calculate actual spend from expenses (debit amounts on journal lines)
    const expenseSpend = project.rdExpenses.reduce(
      (sum, exp) => sum + (exp.journalLine.debit || 0),
      0
    )

    // Calculate time-based spend from time entries
    const timeSpend = project.activities.reduce((actSum, act) => {
      return (
        actSum +
        act.timeEntries.reduce(
          (teSum, te) => teSum + te.hours * (te.hourlyRate || 0),
          0
        )
      )
    }, 0)

    const actualSpend = project.portfolioEntry?.actualSpend ?? expenseSpend + timeSpend
    const burnRate = budget > 0 ? (actualSpend / budget) * 100 : 0
    const probabilityOfSuccess = project.portfolioEntry?.probabilityOfSuccess ?? null
    const expectedROI = project.portfolioEntry?.expectedROI ?? null
    const capitalAllocated = project.portfolioEntry?.capitalAllocated ?? budget

    // Risk rating logic
    let riskRating: "Green" | "Amber" | "Red" = "Green"
    if (burnRate > 100 || (probabilityOfSuccess !== null && probabilityOfSuccess < 0.3)) {
      riskRating = "Red"
    } else if (
      burnRate > 80 ||
      (probabilityOfSuccess !== null && probabilityOfSuccess < 0.6)
    ) {
      riskRating = "Amber"
    }

    return {
      id: project.portfolioEntry?.id ?? project.id,
      projectId: project.id,
      projectName: project.name,
      status: project.portfolioEntry?.status ?? project.status,
      budget,
      actualSpend,
      burnRate: Math.round(burnRate * 100) / 100,
      probabilityOfSuccess,
      expectedROI,
      capitalAllocated,
      riskRating,
    }
  })

  const activeProjects = portfolioData.filter(
    (p) => p.status === "Active" || p.status === "InProgress"
  )
  const totalPortfolioValue = portfolioData.reduce(
    (sum, p) => sum + p.capitalAllocated,
    0
  )
  const totalCapitalDeployed = portfolioData.reduce(
    (sum, p) => sum + p.actualSpend,
    0
  )

  // Weighted expected ROI: sum of (expectedROI * capitalAllocated) / totalCapital
  const projectsWithROI = portfolioData.filter(
    (p) => p.expectedROI !== null && p.capitalAllocated > 0
  )
  const weightedROI =
    projectsWithROI.length > 0
      ? projectsWithROI.reduce(
          (sum, p) => sum + (p.expectedROI ?? 0) * p.capitalAllocated,
          0
        ) /
        projectsWithROI.reduce((sum, p) => sum + p.capitalAllocated, 0)
      : null

  return NextResponse.json({
    projects: portfolioData,
    summary: {
      totalPortfolioValue,
      weightedExpectedROI: weightedROI,
      totalCapitalDeployed,
      activeProjectCount: activeProjects.length,
    },
  })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string
  const body = await request.json()
  const { projectId, probabilityOfSuccess, expectedROI } = body

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    )
  }

  // Verify the project belongs to this org
  const project = await prisma.rdProject.findFirst({
    where: { id: projectId, organizationId: orgId },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}
  if (probabilityOfSuccess !== undefined) {
    data.probabilityOfSuccess = parseFloat(probabilityOfSuccess)
  }
  if (expectedROI !== undefined) {
    data.expectedROI = parseFloat(expectedROI)
  }

  const entry = await prisma.rdPortfolioEntry.upsert({
    where: { rdProjectId: projectId },
    update: data,
    create: {
      rdProjectId: projectId,
      ...data,
    },
  })

  return NextResponse.json(entry)
}
