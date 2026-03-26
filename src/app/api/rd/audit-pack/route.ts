import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateRdClaim, generateClaimBreakdown } from "@/lib/claim-calculator"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId

  try {
    const { projectId, financialYear } = await request.json()

    if (!projectId || !financialYear) {
      return NextResponse.json(
        { error: "projectId and financialYear are required" },
        { status: 400 }
      )
    }

    // Verify project belongs to org
    const project = await prisma.rdProject.findFirst({
      where: { id: projectId, organizationId: orgId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            abn: true,
            aggregatedTurnover: true,
          },
        },
        activities: {
          include: {
            experiments: {
              include: {
                resources: true,
                outcomes: true,
              },
            },
            evidence: true,
            timeEntries: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
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

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Compute time entry totals
    const timeEntries = project.activities.flatMap((a) =>
      a.timeEntries.map((te) => ({
        id: te.id,
        activityId: a.id,
        activityName: a.name,
        userId: te.user.id,
        userName: te.user.name,
        userEmail: te.user.email,
        date: te.date,
        hours: te.hours,
        hourlyRate: te.hourlyRate,
        cost: te.hours * (te.hourlyRate || 0),
        description: te.description,
      }))
    )

    const totalTimeHours = timeEntries.reduce((sum, te) => sum + te.hours, 0)
    const totalTimeCost = timeEntries.reduce((sum, te) => sum + te.cost, 0)

    // Compute expenses
    const expenses = project.rdExpenses.map((e) => ({
      id: e.id,
      category: e.category,
      classification: e.classification,
      amount: e.journalLine?.debit || 0,
      accountCode: e.journalLine?.account?.code || "",
      accountName: e.journalLine?.account?.name || "",
      description: e.journalLine?.description || "",
    }))

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    // Evidence metadata
    const evidenceItems = project.activities.flatMap((a) =>
      a.evidence.map((ev) => ({
        id: ev.id,
        activityId: a.id,
        activityName: a.name,
        fileName: ev.fileName,
        fileType: ev.fileType,
        fileSize: ev.fileSize,
        description: ev.description,
        category: ev.category,
        uploadedAt: ev.uploadedAt,
      }))
    )

    // Compliance checklist summary
    const totalChecklist = project.complianceChecklist.length
    const completedChecklist = project.complianceChecklist.filter(
      (c) => c.completed
    ).length
    const checklistByCategory: Record<
      string,
      { item: string; completed: boolean; notes: string | null }[]
    > = {}
    project.complianceChecklist.forEach((item) => {
      if (!checklistByCategory[item.category]) {
        checklistByCategory[item.category] = []
      }
      checklistByCategory[item.category].push({
        item: item.item,
        completed: item.completed,
        notes: item.notes,
      })
    })

    // Claim calculation
    const eligibleSpend = totalTimeCost + totalExpenses
    const aggregatedTurnover = project.organization.aggregatedTurnover || 0
    const claimResult = calculateRdClaim(eligibleSpend, aggregatedTurnover)

    // Expense breakdown
    const expenseBreakdownInput = [
      ...expenses.map((e) => ({ category: e.category, amount: e.amount })),
    ]
    if (totalTimeCost > 0) {
      expenseBreakdownInput.push({
        category: "Staff Costs (Time Entries)",
        amount: totalTimeCost,
      })
    }
    const claimBreakdown = generateClaimBreakdown(expenseBreakdownInput)

    // Activities summary
    const activitiesSummary = project.activities.map((a) => ({
      id: a.id,
      name: a.name,
      activityType: a.activityType,
      status: a.status,
      hypothesis: a.hypothesis,
      methodology: a.methodology,
      outcome: a.outcome,
      technicalUncertainty: a.technicalUncertainty,
      newKnowledgeSought: a.newKnowledgeSought,
      experimentCount: a.experiments.length,
      evidenceCount: a.evidence.length,
      timeEntryCount: a.timeEntries.length,
      experiments: a.experiments.map((exp) => ({
        id: exp.id,
        name: exp.name,
        hypothesis: exp.hypothesis,
        status: exp.status,
        startDate: exp.startDate,
        endDate: exp.endDate,
        outcome: exp.outcome,
        iterationNumber: exp.iterationNumber,
        resourceCount: exp.resources.length,
        outcomeCount: exp.outcomes.length,
      })),
    }))

    // Build the audit pack
    const auditPack = {
      generatedAt: new Date().toISOString(),
      financialYear,
      organization: {
        name: project.organization.name,
        abn: project.organization.abn,
        aggregatedTurnover: project.organization.aggregatedTurnover,
      },
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        eligibilityStatus: project.eligibilityStatus,
        coreActivityDescription: project.coreActivityDescription,
        hypothesisSummary: project.hypothesisSummary,
        technicalUncertainty: project.technicalUncertainty,
        newKnowledgeSought: project.newKnowledgeSought,
        budget: project.budget,
      },
      activities: activitiesSummary,
      timeTracking: {
        totalHours: totalTimeHours,
        totalCost: totalTimeCost,
        entries: timeEntries,
      },
      expenses: {
        totalAmount: totalExpenses,
        items: expenses,
      },
      evidence: {
        totalCount: evidenceItems.length,
        items: evidenceItems,
      },
      compliance: {
        totalItems: totalChecklist,
        completedItems: completedChecklist,
        completionPercentage:
          totalChecklist > 0
            ? Math.round((completedChecklist / totalChecklist) * 100)
            : 0,
        byCategory: checklistByCategory,
      },
      claimEstimate: {
        totalEligibleExpenditure: eligibleSpend,
        offsetRate: claimResult.offsetRate,
        estimatedOffset: claimResult.estimatedOffset,
        isRefundable: claimResult.isRefundable,
        breakdown: claimBreakdown,
      },
    }

    // Create AuditPack record in database
    await prisma.auditPack.create({
      data: {
        rdProjectId: projectId,
        financialYear,
        status: "Generated",
      },
    })

    return NextResponse.json(auditPack)
  } catch (error) {
    console.error("Audit pack generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate audit pack" },
      { status: 500 }
    )
  }
}
