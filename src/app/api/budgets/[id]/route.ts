import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const budget = await prisma.budget.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: { include: { account: true } },
      },
    })

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 })
    }

    // Compute actuals for each budget item from posted journal lines
    const fyParts = budget.financialYear.split("-")
    const startYear = parseInt(fyParts[0], 10)
    const fyStart = new Date(startYear, 6, 1) // July 1
    const fyEnd = new Date(startYear + 1, 5, 30, 23, 59, 59) // June 30

    const accountIds = budget.items.map((item) => item.accountId)

    const journalLines = await prisma.journalLine.findMany({
      where: {
        accountId: { in: accountIds },
        journalEntry: {
          organizationId: orgId,
          status: "Posted",
          date: { gte: fyStart, lte: fyEnd },
        },
      },
      include: {
        journalEntry: { select: { date: true } },
      },
    })

    // Group actuals by account and month
    const actualsByAccountMonth: Record<string, Record<string, number>> = {}
    for (const line of journalLines) {
      const accId = line.accountId
      const month = line.journalEntry.date.getMonth() // 0-11
      const monthKey = MONTHS[month]
      if (!actualsByAccountMonth[accId]) {
        actualsByAccountMonth[accId] = {}
      }
      // For expense accounts: debit increases, credit decreases
      const amount = line.debit - line.credit
      actualsByAccountMonth[accId][monthKey] =
        (actualsByAccountMonth[accId][monthKey] ?? 0) + amount
    }

    const itemsWithActuals = budget.items.map((item) => {
      const actuals = actualsByAccountMonth[item.accountId] ?? {}
      const monthlyActuals: Record<string, number> = {}
      let actualTotal = 0

      for (const m of MONTHS) {
        const val = Math.round((actuals[m] ?? 0) * 100) / 100
        monthlyActuals[m] = val
        actualTotal += val
      }

      return {
        ...item,
        actuals: monthlyActuals,
        actualTotal: Math.round(actualTotal * 100) / 100,
        varianceDollar: Math.round((item.total - actualTotal) * 100) / 100,
        variancePercent:
          item.total !== 0
            ? Math.round(
                ((item.total - actualTotal) / item.total) * 100 * 100
              ) / 100
            : 0,
      }
    })

    return NextResponse.json({
      ...budget,
      items: itemsWithActuals,
    })
  } catch (error) {
    console.error("Error fetching budget:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const budget = await prisma.budget.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 })
    }

    const body = await request.json()
    const { status, items } = body

    if (status) {
      await prisma.budget.update({
        where: { id },
        data: { status },
      })
    }

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const jan = item.jan ?? 0
        const feb = item.feb ?? 0
        const mar = item.mar ?? 0
        const apr = item.apr ?? 0
        const may = item.may ?? 0
        const jun = item.jun ?? 0
        const jul = item.jul ?? 0
        const aug = item.aug ?? 0
        const sep = item.sep ?? 0
        const oct = item.oct ?? 0
        const nov = item.nov ?? 0
        const dec = item.dec ?? 0
        const total =
          jan + feb + mar + apr + may + jun + jul + aug + sep + oct + nov + dec

        await prisma.budgetItem.update({
          where: { id: item.id },
          data: {
            jan,
            feb,
            mar,
            apr,
            may,
            jun,
            jul,
            aug,
            sep,
            oct,
            nov,
            dec,
            total,
            notes: item.notes ?? null,
          },
        })
      }
    }

    const updated = await prisma.budget.findFirst({
      where: { id },
      include: { items: { include: { account: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating budget:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
