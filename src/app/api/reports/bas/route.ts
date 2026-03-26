import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function parsePeriodDates(period: string, fy: string): { start: Date; end: Date } | null {
  const fyYear = parseInt(fy, 10)
  if (isNaN(fyYear)) return null

  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }

  // Monthly periods: "Jan", "Feb", etc.
  if (months[period] !== undefined) {
    const m = months[period]
    const year = m >= 6 ? fyYear - 1 : fyYear
    const lastDay = new Date(year, m + 1, 0).getDate()
    return {
      start: new Date(year, m, 1),
      end: new Date(year, m, lastDay, 23, 59, 59),
    }
  }

  // Quarterly periods: "Q1", "Q2", "Q3", "Q4"
  const quarterMap: Record<string, { startMonth: number; endMonth: number }> = {
    Q1: { startMonth: 6, endMonth: 8 },   // Jul-Sep
    Q2: { startMonth: 9, endMonth: 11 },   // Oct-Dec
    Q3: { startMonth: 0, endMonth: 2 },    // Jan-Mar
    Q4: { startMonth: 3, endMonth: 5 },    // Apr-Jun
  }

  if (quarterMap[period]) {
    const q = quarterMap[period]
    const year = q.startMonth >= 6 ? fyYear - 1 : fyYear
    const lastDay = new Date(year, q.endMonth + 1, 0).getDate()
    return {
      start: new Date(year, q.startMonth, 1),
      end: new Date(year, q.endMonth, lastDay, 23, 59, 59),
    }
  }

  return null
}

async function computeBASData(orgId: string, startDate: Date, endDate: Date) {
  // GST Collected accounts (Liability)
  const gstCollectedAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: { contains: "GST Collected" } },
        { name: { contains: "GST on Sales" } },
        { taxType: "GSTCollected" },
        { subType: "GSTCollected" },
      ],
    },
  })

  // GST Paid accounts (Asset)
  const gstPaidAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: { contains: "GST Paid" } },
        { name: { contains: "GST on Purchases" } },
        { name: { contains: "Input Tax" } },
        { taxType: "GSTPaid" },
        { subType: "GSTPaid" },
      ],
    },
  })

  const gstCollectedIds = gstCollectedAccounts.map((a) => a.id)
  const gstPaidIds = gstPaidAccounts.map((a) => a.id)

  // Revenue accounts for G1
  const revenueAccounts = await prisma.account.findMany({
    where: { organizationId: orgId, type: "Revenue" },
  })
  const revenueIds = revenueAccounts.map((a) => a.id)

  // Export revenue accounts for G2
  const exportAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      type: "Revenue",
      OR: [
        { name: { contains: "Export" } },
        { taxType: "GSTFreeExport" },
        { subType: "ExportRevenue" },
      ],
    },
  })
  const exportIds = exportAccounts.map((a) => a.id)

  // GST-free revenue for G3
  const gstFreeAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      type: "Revenue",
      OR: [
        { taxType: "GSTFree" },
        { subType: "GSTFreeRevenue" },
        { name: { contains: "GST-Free" } },
        { name: { contains: "GST Free" } },
      ],
    },
  })
  const gstFreeIds = gstFreeAccounts.map((a) => a.id)

  // Asset accounts for G10 capital purchases
  const assetAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { type: "Asset", subType: "FixedAsset" },
        { type: "Asset", name: { contains: "Equipment" } },
        { type: "Asset", name: { contains: "Plant" } },
        { type: "Asset", name: { contains: "Vehicle" } },
        { type: "Asset", name: { contains: "Capital" } },
      ],
    },
  })
  const assetIds = assetAccounts.map((a) => a.id)

  // Expense accounts for G11 non-capital purchases
  const expenseAccounts = await prisma.account.findMany({
    where: { organizationId: orgId, type: "Expense" },
  })
  const expenseIds = expenseAccounts.map((a) => a.id)

  // Wages/salary accounts for W1/W2
  const wageAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: { contains: "Wages" } },
        { name: { contains: "Salaries" } },
        { name: { contains: "Salary" } },
        { subType: "Wages" },
      ],
    },
  })
  const wageIds = wageAccounts.map((a) => a.id)

  const paygAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: { contains: "PAYG" } },
        { name: { contains: "Withholding" } },
        { taxType: "PAYG" },
        { subType: "PAYGWithholding" },
      ],
    },
  })
  const paygIds = paygAccounts.map((a) => a.id)

  // Collect all account IDs we need
  const allIds = [
    ...gstCollectedIds,
    ...gstPaidIds,
    ...revenueIds,
    ...assetIds,
    ...expenseIds,
    ...wageIds,
    ...paygIds,
  ]

  const journalLines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: allIds },
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: startDate, lte: endDate },
      },
    },
    include: { journalEntry: true },
  })

  let g1TotalSales = 0
  let g2ExportSales = 0
  let g3GstFreeSales = 0
  let g10CapitalPurchases = 0
  let g11NonCapitalPurchases = 0
  let gstOnSales = 0
  let gstOnPurchases = 0
  let w1TotalWages = 0
  let w2Withheld = 0

  for (const line of journalLines) {
    const netCredit = line.credit - line.debit
    const netDebit = line.debit - line.credit

    if (gstCollectedIds.includes(line.accountId)) {
      gstOnSales += netCredit
    }
    if (gstPaidIds.includes(line.accountId)) {
      gstOnPurchases += netDebit
    }
    if (revenueIds.includes(line.accountId)) {
      g1TotalSales += netCredit
    }
    if (exportIds.includes(line.accountId)) {
      g2ExportSales += netCredit
    }
    if (gstFreeIds.includes(line.accountId)) {
      g3GstFreeSales += netCredit
    }
    if (assetIds.includes(line.accountId)) {
      g10CapitalPurchases += netDebit
    }
    if (expenseIds.includes(line.accountId)) {
      g11NonCapitalPurchases += netDebit
    }
    if (wageIds.includes(line.accountId)) {
      w1TotalWages += netDebit
    }
    if (paygIds.includes(line.accountId)) {
      w2Withheld += netCredit
    }
  }

  const netGst = gstOnSales - gstOnPurchases

  return {
    g1TotalSales,
    g2ExportSales,
    g3GstFreeSales,
    g10CapitalPurchases,
    g11NonCapitalPurchases,
    gstOnSales,
    gstOnPurchases,
    netGst,
    w1TotalWages,
    w2Withheld,
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") // Q1, Q2, Jan, Feb, etc.
  const fy = searchParams.get("fy") // e.g., 2026 for FY 2025-26

  if (!period || !fy) {
    return NextResponse.json(
      { error: "Missing required parameters: period and fy" },
      { status: 400 }
    )
  }

  const dates = parsePeriodDates(period, fy)
  if (!dates) {
    return NextResponse.json(
      { error: "Invalid period or financial year" },
      { status: 400 }
    )
  }

  const data = await computeBASData(orgId, dates.start, dates.end)

  return NextResponse.json({
    period,
    fy,
    startDate: dates.start.toISOString(),
    endDate: dates.end.toISOString(),
    ...data,
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const body = await request.json()
  const { period, fy, action } = body

  if (!period || !fy) {
    return NextResponse.json(
      { error: "Missing required parameters: period and fy" },
      { status: 400 }
    )
  }

  const dates = parsePeriodDates(period, fy)
  if (!dates) {
    return NextResponse.json(
      { error: "Invalid period or financial year" },
      { status: 400 }
    )
  }

  const fyYear = parseInt(fy, 10)
  const periodLabel = period.startsWith("Q")
    ? `${period} ${fyYear - 1}-${String(fyYear).slice(2)}`
    : `${period} ${dates.start.getMonth() >= 6 ? fyYear - 1 : fyYear}`

  // Check if a BAS return already exists for this period
  const existing = await prisma.bASReturn.findFirst({
    where: {
      organizationId: orgId,
      period: periodLabel,
    },
  })

  if (action === "lodge") {
    // Mark as lodged
    if (existing) {
      const updated = await prisma.bASReturn.update({
        where: { id: existing.id },
        data: {
          status: "Lodged",
          lodgedAt: new Date(),
        },
      })
      return NextResponse.json(updated)
    }

    // Compute and save as lodged
    const data = await computeBASData(orgId, dates.start, dates.end)
    const created = await prisma.bASReturn.create({
      data: {
        organizationId: orgId,
        period: periodLabel,
        startDate: dates.start,
        endDate: dates.end,
        status: "Lodged",
        lodgedAt: new Date(),
        ...data,
      },
    })
    return NextResponse.json(created)
  }

  // Default: save as draft
  const data = await computeBASData(orgId, dates.start, dates.end)

  if (existing) {
    const updated = await prisma.bASReturn.update({
      where: { id: existing.id },
      data: {
        ...data,
        startDate: dates.start,
        endDate: dates.end,
      },
    })
    return NextResponse.json(updated)
  }

  const created = await prisma.bASReturn.create({
    data: {
      organizationId: orgId,
      period: periodLabel,
      startDate: dates.start,
      endDate: dates.end,
      status: "Draft",
      ...data,
    },
  })

  return NextResponse.json(created)
}
