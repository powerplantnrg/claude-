import { prisma } from "./prisma"
import { getFYDates } from "./financial-year"

/**
 * Auto-generate all standard Australian compliance deadlines for a financial year.
 *
 * Key deadlines covered:
 * - BAS quarterly (28th of the month after quarter end)
 * - STP finalisation (14 July)
 * - Super guarantee (28 days after quarter end)
 * - PAYG instalments (aligned with BAS)
 * - FBT return (21 May)
 * - Company tax return (generally 15 May or later with agent)
 * - R&D Tax Incentive registration (30 April)
 */
export async function generateComplianceDeadlines(
  orgId: string,
  fy: string
) {
  const { startDate, endDate } = getFYDates(fy)
  const startYear = startDate.getFullYear() // e.g. 2025 for FY 2025-26
  const endYear = endDate.getFullYear() // e.g. 2026 for FY 2025-26

  const deadlines: Array<{
    title: string
    description: string
    category: string
    dueDate: Date
    frequency: string
    reminderDays: number
  }> = []

  // --- BAS Quarterly ---
  // Q1 (Jul-Sep): due 28 Oct
  deadlines.push({
    title: `BAS Q1 ${fy}`,
    description: `Business Activity Statement for Q1 (Jul-Sep ${startYear})`,
    category: "BAS",
    dueDate: new Date(startYear, 9, 28), // Oct 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  // Q2 (Oct-Dec): due 28 Feb
  deadlines.push({
    title: `BAS Q2 ${fy}`,
    description: `Business Activity Statement for Q2 (Oct-Dec ${startYear})`,
    category: "BAS",
    dueDate: new Date(endYear, 1, 28), // Feb 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  // Q3 (Jan-Mar): due 28 Apr
  deadlines.push({
    title: `BAS Q3 ${fy}`,
    description: `Business Activity Statement for Q3 (Jan-Mar ${endYear})`,
    category: "BAS",
    dueDate: new Date(endYear, 3, 28), // Apr 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  // Q4 (Apr-Jun): due 28 Jul (next FY start)
  deadlines.push({
    title: `BAS Q4 ${fy}`,
    description: `Business Activity Statement for Q4 (Apr-Jun ${endYear})`,
    category: "BAS",
    dueDate: new Date(endYear, 6, 28), // Jul 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  // --- STP Finalisation ---
  // Due 14 July after FY end
  deadlines.push({
    title: `STP Finalisation ${fy}`,
    description: `Single Touch Payroll finalisation declaration for FY ${fy}`,
    category: "STP",
    dueDate: new Date(endYear, 6, 14), // Jul 14
    frequency: "Annually",
    reminderDays: 21,
  })

  // --- Super Guarantee ---
  // Q1: 28 Oct, Q2: 28 Jan, Q3: 28 Apr, Q4: 28 Jul
  deadlines.push({
    title: `Super Guarantee Q1 ${fy}`,
    description: `Superannuation guarantee payment for Q1 (Jul-Sep ${startYear})`,
    category: "SuperGuarantee",
    dueDate: new Date(startYear, 9, 28), // Oct 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  deadlines.push({
    title: `Super Guarantee Q2 ${fy}`,
    description: `Superannuation guarantee payment for Q2 (Oct-Dec ${startYear})`,
    category: "SuperGuarantee",
    dueDate: new Date(endYear, 0, 28), // Jan 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  deadlines.push({
    title: `Super Guarantee Q3 ${fy}`,
    description: `Superannuation guarantee payment for Q3 (Jan-Mar ${endYear})`,
    category: "SuperGuarantee",
    dueDate: new Date(endYear, 3, 28), // Apr 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  deadlines.push({
    title: `Super Guarantee Q4 ${fy}`,
    description: `Superannuation guarantee payment for Q4 (Apr-Jun ${endYear})`,
    category: "SuperGuarantee",
    dueDate: new Date(endYear, 6, 28), // Jul 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  // --- PAYG Instalments (aligned with BAS quarters) ---
  deadlines.push({
    title: `PAYG Instalment Q1 ${fy}`,
    description: `PAYG income tax instalment for Q1 (Jul-Sep ${startYear})`,
    category: "IncomeTax",
    dueDate: new Date(startYear, 9, 28), // Oct 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  deadlines.push({
    title: `PAYG Instalment Q2 ${fy}`,
    description: `PAYG income tax instalment for Q2 (Oct-Dec ${startYear})`,
    category: "IncomeTax",
    dueDate: new Date(endYear, 1, 28), // Feb 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  deadlines.push({
    title: `PAYG Instalment Q3 ${fy}`,
    description: `PAYG income tax instalment for Q3 (Jan-Mar ${endYear})`,
    category: "IncomeTax",
    dueDate: new Date(endYear, 3, 28), // Apr 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  deadlines.push({
    title: `PAYG Instalment Q4 ${fy}`,
    description: `PAYG income tax instalment for Q4 (Apr-Jun ${endYear})`,
    category: "IncomeTax",
    dueDate: new Date(endYear, 6, 28), // Jul 28
    frequency: "Quarterly",
    reminderDays: 14,
  })

  // --- FBT Return ---
  // FBT year runs 1 Apr - 31 Mar; return due 21 May
  deadlines.push({
    title: `FBT Return ${fy}`,
    description: `Fringe Benefits Tax return for FBT year ending 31 March ${endYear}`,
    category: "FBT",
    dueDate: new Date(endYear, 4, 21), // May 21
    frequency: "Annually",
    reminderDays: 28,
  })

  // --- Company Tax Return ---
  // Due by 15 May of the following year (with tax agent, may be later)
  deadlines.push({
    title: `Company Tax Return ${fy}`,
    description: `Company income tax return for FY ${fy}`,
    category: "IncomeTax",
    dueDate: new Date(endYear + 1, 4, 15), // May 15 next year
    frequency: "Annually",
    reminderDays: 30,
  })

  // --- R&D Tax Incentive Registration ---
  // Must register within 10 months of FY end (by 30 April)
  deadlines.push({
    title: `R&D Tax Incentive Registration ${fy}`,
    description: `Register R&D activities with AusIndustry for FY ${fy}. Must be registered within 10 months of financial year end.`,
    category: "RDTaxIncentive",
    dueDate: new Date(endYear + 1, 3, 30), // Apr 30 next year
    frequency: "Annually",
    reminderDays: 60,
  })

  // Create all deadlines in the database
  const created = []
  for (const d of deadlines) {
    const deadline = await prisma.complianceDeadline.create({
      data: {
        organizationId: orgId,
        ...d,
      },
    })
    created.push(deadline)
  }

  return created
}

/**
 * Get upcoming compliance deadlines within the next N days.
 */
export async function getUpcomingDeadlines(orgId: string, days: number) {
  const now = new Date()
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)

  return prisma.complianceDeadline.findMany({
    where: {
      organizationId: orgId,
      dueDate: {
        gte: now,
        lte: futureDate,
      },
      status: { in: ["Upcoming", "Due"] },
    },
    orderBy: { dueDate: "asc" },
  })
}

/**
 * Mark a compliance deadline as completed.
 */
export async function markDeadlineComplete(
  deadlineId: string,
  userId: string
) {
  const deadline = await prisma.complianceDeadline.findUnique({
    where: { id: deadlineId },
  })

  if (!deadline) {
    throw new Error("Compliance deadline not found")
  }

  if (deadline.status === "Completed") {
    throw new Error("Deadline is already marked as completed")
  }

  return prisma.complianceDeadline.update({
    where: { id: deadlineId },
    data: {
      status: "Completed",
      completedAt: new Date(),
      completedById: userId,
    },
  })
}
