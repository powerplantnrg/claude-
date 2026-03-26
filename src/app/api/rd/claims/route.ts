import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateRdClaim, generateClaimBreakdown } from "@/lib/claim-calculator"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  const claimDrafts = await prisma.rdClaimDraft.findMany({
    where: {
      rdProject: { organizationId: orgId },
    },
    include: {
      rdProject: true,
    },
    orderBy: { generatedAt: "desc" },
  })

  return NextResponse.json(claimDrafts)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()
  const { financialYear, rdProjectId } = body

  if (!financialYear) {
    return NextResponse.json(
      { error: "Financial year is required" },
      { status: 400 }
    )
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  })

  // Get R&D expenses, optionally filtered by project
  const where: any = {
    rdProject: { organizationId: orgId },
    journalLine: {
      journalEntry: { status: "Posted" },
    },
  }
  if (rdProjectId) {
    where.rdProjectId = rdProjectId
  }

  const rdExpenses = await prisma.rdExpense.findMany({
    where,
    include: {
      journalLine: {
        include: {
          journalEntry: true,
        },
      },
    },
  })

  const expenses = rdExpenses.map((e) => ({
    category: e.category,
    amount: e.journalLine.debit,
  }))

  const breakdown = generateClaimBreakdown(expenses)
  const turnover = org?.aggregatedTurnover ?? 0
  const claimResult = calculateRdClaim(breakdown.totalEligible, turnover)

  // Find a project to associate with (use first project if no specific one)
  let projectId = rdProjectId
  if (!projectId) {
    const firstProject = await prisma.rdProject.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
    })
    projectId = firstProject?.id ?? null
  }

  if (!projectId) {
    return NextResponse.json(
      { error: "No R&D projects found. Create a project first." },
      { status: 400 }
    )
  }

  const draft = await prisma.rdClaimDraft.create({
    data: {
      rdProjectId: projectId,
      financialYear,
      totalEligibleExpenditure: breakdown.totalEligible,
      offsetRate: claimResult.offsetRate,
      estimatedOffset: claimResult.estimatedOffset,
      breakdownJson: JSON.stringify(breakdown),
      status: "Draft",
    },
  })

  return NextResponse.json(draft, { status: 201 })
}
