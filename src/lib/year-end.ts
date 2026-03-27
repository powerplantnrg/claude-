import { prisma } from "./prisma"
import { getFYDates } from "./financial-year"

/**
 * Lock a financial period to prevent journal entries within the date range.
 */
export async function lockPeriod(
  orgId: string,
  start: Date,
  end: Date,
  userId: string,
  reason?: string
) {
  // Check for overlapping locked periods
  const existing = await prisma.lockedPeriod.findFirst({
    where: {
      organizationId: orgId,
      status: "Locked",
      periodStart: { lte: end },
      periodEnd: { gte: start },
    },
  })

  if (existing) {
    throw new Error(
      `Overlapping locked period exists (${existing.periodStart.toISOString()} - ${existing.periodEnd.toISOString()})`
    )
  }

  return prisma.lockedPeriod.create({
    data: {
      organizationId: orgId,
      periodStart: start,
      periodEnd: end,
      lockedById: userId,
      reason: reason || undefined,
      status: "Locked",
    },
  })
}

/**
 * Unlock a previously locked period.
 */
export async function unlockPeriod(periodId: string, _userId: string) {
  const period = await prisma.lockedPeriod.findUnique({
    where: { id: periodId },
  })

  if (!period) {
    throw new Error("Locked period not found")
  }

  if (period.status === "Unlocked") {
    throw new Error("Period is already unlocked")
  }

  return prisma.lockedPeriod.update({
    where: { id: periodId },
    data: { status: "Unlocked" },
  })
}

/**
 * Check whether a given date falls within any locked period for the organization.
 */
export async function isPeriodLocked(
  orgId: string,
  date: Date
): Promise<boolean> {
  const locked = await prisma.lockedPeriod.findFirst({
    where: {
      organizationId: orgId,
      status: "Locked",
      periodStart: { lte: date },
      periodEnd: { gte: date },
    },
  })

  return locked !== null
}

/**
 * Close a financial year:
 * 1. Calculate net P&L (Revenue - Expenses) for the FY
 * 2. Create a journal entry transferring the result to Retained Earnings
 * 3. Lock all periods (quarters) in the FY
 */
export async function closeFinancialYear(
  orgId: string,
  fy: string,
  userId: string
) {
  const { startDate, endDate } = getFYDates(fy)

  // Check if already closed
  const existingClose = await prisma.yearEndClose.findFirst({
    where: {
      organizationId: orgId,
      financialYear: fy,
      status: { in: ["InProgress", "Completed"] },
    },
  })

  if (existingClose) {
    throw new Error(`Financial year ${fy} is already closed or in progress`)
  }

  // Create the year-end close record
  const yearEndClose = await prisma.yearEndClose.create({
    data: {
      organizationId: orgId,
      financialYear: fy,
      closedById: userId,
      status: "InProgress",
    },
  })

  try {
    // Calculate P&L: sum all revenue and expense journal lines in the FY
    const revenueLines = await prisma.journalLine.findMany({
      where: {
        journalEntry: {
          organizationId: orgId,
          date: { gte: startDate, lte: endDate },
          status: "Posted",
        },
        account: { type: "Revenue" },
      },
    })

    const expenseLines = await prisma.journalLine.findMany({
      where: {
        journalEntry: {
          organizationId: orgId,
          date: { gte: startDate, lte: endDate },
          status: "Posted",
        },
        account: { type: "Expense" },
      },
    })

    // Revenue: credits - debits (revenue grows on credit side)
    const totalRevenue = revenueLines.reduce(
      (sum, l) => sum + l.credit - l.debit,
      0
    )
    // Expenses: debits - credits (expenses grow on debit side)
    const totalExpenses = expenseLines.reduce(
      (sum, l) => sum + l.debit - l.credit,
      0
    )
    const netProfit = totalRevenue - totalExpenses

    // Find the Retained Earnings account
    const retainedEarningsAcct = await prisma.account.findFirst({
      where: {
        organizationId: orgId,
        code: "3100", // Retained Earnings
      },
    })

    // Find the Current Year Earnings account
    const currentYearEarningsAcct = await prisma.account.findFirst({
      where: {
        organizationId: orgId,
        code: "3200", // Current Year Earnings
      },
    })

    if (!retainedEarningsAcct || !currentYearEarningsAcct) {
      throw new Error(
        "Retained Earnings (3100) or Current Year Earnings (3200) account not found"
      )
    }

    // Get next entry number
    const lastEntry = await prisma.journalEntry.findFirst({
      where: { organizationId: orgId },
      orderBy: { entryNumber: "desc" },
    })
    const nextEntryNumber = (lastEntry?.entryNumber || 0) + 1

    // Create journal entry to transfer P&L to retained earnings
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: nextEntryNumber,
        date: endDate,
        reference: `YE-${fy}`,
        narration: `Year-end close FY ${fy}: Transfer net profit/loss to retained earnings`,
        status: "Posted",
        sourceType: "YearEndClose",
        sourceId: yearEndClose.id,
        organizationId: orgId,
        lines: {
          create:
            netProfit >= 0
              ? [
                  {
                    accountId: currentYearEarningsAcct.id,
                    description: `Close Current Year Earnings FY ${fy}`,
                    debit: netProfit,
                    credit: 0,
                  },
                  {
                    accountId: retainedEarningsAcct.id,
                    description: `Transfer net profit to Retained Earnings FY ${fy}`,
                    debit: 0,
                    credit: netProfit,
                  },
                ]
              : [
                  {
                    accountId: retainedEarningsAcct.id,
                    description: `Transfer net loss to Retained Earnings FY ${fy}`,
                    debit: Math.abs(netProfit),
                    credit: 0,
                  },
                  {
                    accountId: currentYearEarningsAcct.id,
                    description: `Close Current Year Earnings FY ${fy}`,
                    debit: 0,
                    credit: Math.abs(netProfit),
                  },
                ],
        },
      },
    })

    // Lock the entire FY period
    await lockPeriod(
      orgId,
      startDate,
      endDate,
      userId,
      `Year-end close FY ${fy}`
    )

    // Update year-end close to completed
    return prisma.yearEndClose.update({
      where: { id: yearEndClose.id },
      data: {
        status: "Completed",
        retainedEarningsEntryId: journalEntry.id,
      },
    })
  } catch (error) {
    // If anything fails, mark as reversed
    await prisma.yearEndClose.update({
      where: { id: yearEndClose.id },
      data: { status: "Reversed" },
    })
    throw error
  }
}

/**
 * Reverse a year-end close:
 * 1. Mark the close as Reversed
 * 2. Reverse the retained earnings journal entry
 * 3. Unlock the periods locked by the close
 */
export async function reverseYearEndClose(closeId: string, _userId: string) {
  const yearEndClose = await prisma.yearEndClose.findUnique({
    where: { id: closeId },
    include: { retainedEarningsEntry: true },
  })

  if (!yearEndClose) {
    throw new Error("Year-end close not found")
  }

  if (yearEndClose.status === "Reversed") {
    throw new Error("Year-end close has already been reversed")
  }

  const { startDate, endDate } = getFYDates(yearEndClose.financialYear)

  // Void the retained earnings journal entry
  if (yearEndClose.retainedEarningsEntryId) {
    await prisma.journalEntry.update({
      where: { id: yearEndClose.retainedEarningsEntryId },
      data: { status: "Voided" },
    })
  }

  // Unlock any locked periods that fall within the FY
  const lockedPeriods = await prisma.lockedPeriod.findMany({
    where: {
      organizationId: yearEndClose.organizationId,
      status: "Locked",
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate },
    },
  })

  for (const lp of lockedPeriods) {
    await prisma.lockedPeriod.update({
      where: { id: lp.id },
      data: { status: "Unlocked" },
    })
  }

  // Mark the close as reversed
  return prisma.yearEndClose.update({
    where: { id: closeId },
    data: { status: "Reversed" },
  })
}
