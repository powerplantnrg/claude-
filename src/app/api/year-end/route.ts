import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { closeFinancialYear } from "@/lib/year-end"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId as string

    const yearEndCloses = await prisma.yearEndClose.findMany({
      where: { organizationId: orgId },
      include: {
        closedBy: { select: { id: true, name: true, email: true } },
        retainedEarningsEntry: {
          select: { id: true, entryNumber: true, date: true, narration: true },
        },
      },
      orderBy: { financialYear: "desc" },
    })

    return NextResponse.json(yearEndCloses)
  } catch (error) {
    console.error("Error fetching year-end closes:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string

    const body = await req.json()
    const { financialYear, notes } = body

    if (!financialYear) {
      return NextResponse.json(
        { error: "financialYear is required (e.g. 2025 for FY 2024/2025)" },
        { status: 400 }
      )
    }

    const fyNum = parseInt(financialYear, 10)
    if (isNaN(fyNum)) {
      return NextResponse.json(
        { error: "financialYear must be a number" },
        { status: 400 }
      )
    }

    // Check if year is already closed
    const existing = await prisma.yearEndClose.findFirst({
      where: {
        organizationId: orgId,
        financialYear: financialYear,
        status: { in: ["InProgress", "Completed"] },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Financial year ${financialYear} is already closed or in progress` },
        { status: 409 }
      )
    }

    // Calculate P&L for the financial year
    const fyStart = new Date(fyNum - 1, 6, 1) // July 1
    const fyEnd = new Date(fyNum, 5, 30, 23, 59, 59) // June 30

    const journalLines = await prisma.journalLine.findMany({
      where: {
        journalEntry: {
          organizationId: orgId,
          status: "Posted",
          date: { gte: fyStart, lte: fyEnd },
        },
        account: { type: { in: ["Revenue", "Expense"] } },
      },
      include: { account: true },
    })

    let totalRevenue = 0
    let totalExpenses = 0
    const revenueLines: { accountId: string; code: string; name: string; amount: number }[] = []
    const expenseLines: { accountId: string; code: string; name: string; amount: number }[] = []
    const accountTotals: Record<string, { accountId: string; code: string; name: string; type: string; amount: number }> = {}

    for (const line of journalLines) {
      if (!accountTotals[line.accountId]) {
        accountTotals[line.accountId] = {
          accountId: line.accountId,
          code: line.account.code,
          name: line.account.name,
          type: line.account.type,
          amount: 0,
        }
      }
      if (line.account.type === "Revenue") {
        const amount = line.credit - line.debit
        accountTotals[line.accountId].amount += amount
        totalRevenue += amount
      } else {
        const amount = line.debit - line.credit
        accountTotals[line.accountId].amount += amount
        totalExpenses += amount
      }
    }

    for (const acct of Object.values(accountTotals)) {
      if (acct.type === "Revenue") {
        revenueLines.push({ accountId: acct.accountId, code: acct.code, name: acct.name, amount: acct.amount })
      } else {
        expenseLines.push({ accountId: acct.accountId, code: acct.code, name: acct.name, amount: acct.amount })
      }
    }

    const netProfitLoss = totalRevenue - totalExpenses

    // Close the financial year: create retained earnings JE and lock periods
    const yearEndClose = await closeFinancialYear(orgId, financialYear, userId)

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "YearEndClose",
        entityId: yearEndClose.id,
        details: `Closed FY ${fyNum - 1}/${fyNum}. Net P&L: ${netProfitLoss.toFixed(2)}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json({
      ...yearEndClose,
      summary: {
        revenue: revenueLines.sort((a, b) => a.code.localeCompare(b.code)),
        totalRevenue,
        expenses: expenseLines.sort((a, b) => a.code.localeCompare(b.code)),
        totalExpenses,
        netProfitLoss,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Error closing financial year:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
