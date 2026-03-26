import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const { searchParams } = new URL(request.url)
  const reportType = searchParams.get("type")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const fy = searchParams.get("fy")

  // Determine date range
  const now = new Date()
  let startDate: Date
  let endDate: Date

  if (from && to) {
    startDate = new Date(from)
    endDate = new Date(to)
  } else if (fy) {
    const fyYear = parseInt(fy, 10)
    startDate = new Date(fyYear - 1, 6, 1)
    endDate = new Date(fyYear, 5, 30, 23, 59, 59)
  } else {
    const fyEnd = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
    startDate = new Date(fyEnd - 1, 6, 1)
    endDate = new Date(fyEnd, 5, 30, 23, 59, 59)
  }

  switch (reportType) {
    case "pnl":
      return handlePnL(orgId, startDate, endDate)
    case "balance-sheet":
      return handleBalanceSheet(orgId, endDate)
    case "trial-balance":
      return handleTrialBalance(orgId, endDate)
    case "cash-flow":
      return handleCashFlow(orgId, startDate, endDate)
    case "gst":
      return handleGST(orgId, startDate, endDate)
    case "rd-expenditure":
      return handleRdExpenditure(orgId, startDate, endDate)
    default:
      return NextResponse.json(
        { error: "Invalid report type. Use: pnl, balance-sheet, trial-balance, cash-flow, gst, rd-expenditure" },
        { status: 400 }
      )
  }
}

async function handlePnL(orgId: string, startDate: Date, endDate: Date) {
  const journalLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: startDate, lte: endDate },
      },
      account: { type: { in: ["Revenue", "Expense"] } },
    },
    include: { account: true },
  })

  const revenueAccounts: Record<string, { code: string; name: string; total: number }> = {}
  const expenseAccounts: Record<string, { code: string; name: string; subType: string; total: number }> = {}

  for (const line of journalLines) {
    if (line.account.type === "Revenue") {
      if (!revenueAccounts[line.accountId]) {
        revenueAccounts[line.accountId] = { code: line.account.code, name: line.account.name, total: 0 }
      }
      revenueAccounts[line.accountId].total += line.credit - line.debit
    } else {
      if (!expenseAccounts[line.accountId]) {
        expenseAccounts[line.accountId] = {
          code: line.account.code, name: line.account.name,
          subType: line.account.subType || "Other", total: 0,
        }
      }
      expenseAccounts[line.accountId].total += line.debit - line.credit
    }
  }

  const revenue = Object.values(revenueAccounts).sort((a, b) => a.code.localeCompare(b.code))
  const expenses = Object.values(expenseAccounts).sort((a, b) => a.code.localeCompare(b.code))
  const totalRevenue = revenue.reduce((s, r) => s + r.total, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.total, 0)

  return NextResponse.json({
    type: "pnl",
    period: { from: startDate.toISOString(), to: endDate.toISOString() },
    revenue,
    totalRevenue,
    expenses,
    totalExpenses,
    netProfitLoss: totalRevenue - totalExpenses,
  })
}

async function handleBalanceSheet(orgId: string, asAtDate: Date) {
  const journalLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { lte: asAtDate },
      },
    },
    include: { account: true },
  })

  const balances: Record<string, { code: string; name: string; type: string; balance: number }> = {}

  for (const line of journalLines) {
    if (!balances[line.accountId]) {
      balances[line.accountId] = {
        code: line.account.code, name: line.account.name,
        type: line.account.type, balance: 0,
      }
    }
    balances[line.accountId].balance += line.debit - line.credit
  }

  const accounts = Object.values(balances).filter((a) => Math.abs(a.balance) > 0.01)
  const assets = accounts.filter((a) => a.type === "Asset").map((a) => ({ ...a }))
  const liabilities = accounts.filter((a) => a.type === "Liability").map((a) => ({ ...a, balance: -a.balance }))
  const equity = accounts.filter((a) => a.type === "Equity").map((a) => ({ ...a, balance: -a.balance }))
  const retainedEarnings = accounts
    .filter((a) => a.type === "Revenue" || a.type === "Expense")
    .reduce((s, a) => s + -a.balance, 0)

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0)
  const totalEquity = equity.reduce((s, a) => s + a.balance, 0) + retainedEarnings

  return NextResponse.json({
    type: "balance-sheet",
    asAt: asAtDate.toISOString(),
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity,
    retainedEarnings,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  })
}

async function handleTrialBalance(orgId: string, asAtDate: Date) {
  const journalLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { lte: asAtDate },
      },
    },
    include: { account: true },
  })

  const accountMap: Record<string, { code: string; name: string; type: string; totalDebit: number; totalCredit: number }> = {}

  for (const line of journalLines) {
    if (!accountMap[line.accountId]) {
      accountMap[line.accountId] = {
        code: line.account.code, name: line.account.name,
        type: line.account.type, totalDebit: 0, totalCredit: 0,
      }
    }
    accountMap[line.accountId].totalDebit += line.debit
    accountMap[line.accountId].totalCredit += line.credit
  }

  const rows = Object.values(accountMap)
    .filter((a) => Math.abs(a.totalDebit - a.totalCredit) > 0.01)
    .map((a) => {
      const net = a.totalDebit - a.totalCredit
      return {
        code: a.code, name: a.name, type: a.type,
        debit: net > 0 ? net : 0,
        credit: net < 0 ? -net : 0,
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code))

  const totalDebits = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredits = rows.reduce((s, r) => s + r.credit, 0)

  return NextResponse.json({
    type: "trial-balance",
    asAt: asAtDate.toISOString(),
    rows,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
  })
}

async function handleCashFlow(orgId: string, startDate: Date, endDate: Date) {
  const bankAccounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
      type: "Asset",
      OR: [
        { subType: { in: ["Bank", "Cash"] } },
        { name: { contains: "Bank" } },
        { name: { contains: "Cash" } },
      ],
    },
  })

  const bankAccountIds = bankAccounts.map((a) => a.id)

  const bankJournalLines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: bankAccountIds },
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: startDate, lte: endDate },
      },
    },
    include: {
      journalEntry: {
        include: { lines: { include: { account: true } } },
      },
    },
  })

  const operating: { description: string; amount: number }[] = []
  const investing: { description: string; amount: number }[] = []
  const financing: { description: string; amount: number }[] = []
  const processedEntries = new Set<string>()

  for (const bankLine of bankJournalLines) {
    const entry = bankLine.journalEntry
    if (processedEntries.has(entry.id)) continue
    processedEntries.add(entry.id)

    const cashEffect = entry.lines
      .filter((l) => bankAccountIds.includes(l.accountId))
      .reduce((sum, l) => sum + l.debit - l.credit, 0)

    if (Math.abs(cashEffect) < 0.01) continue

    const counterpartSubTypes = entry.lines
      .filter((l) => !bankAccountIds.includes(l.accountId))
      .map((l) => l.account.subType || "")
    const counterpartTypes = entry.lines
      .filter((l) => !bankAccountIds.includes(l.accountId))
      .map((l) => l.account.type)

    const item = {
      description: entry.narration || entry.reference || `Journal #${entry.entryNumber}`,
      amount: cashEffect,
    }

    const isInvesting = counterpartSubTypes.some((st) =>
      ["FixedAsset", "NonCurrentAsset", "Investment", "Equipment", "Property"].includes(st)
    )
    const isFinancing =
      counterpartTypes.includes("Equity") ||
      counterpartSubTypes.some((st) =>
        ["Loan", "LongTermLiability", "ShareCapital", "Drawings"].includes(st)
      )

    if (isInvesting) investing.push(item)
    else if (isFinancing) financing.push(item)
    else operating.push(item)
  }

  const totalOperating = operating.reduce((s, i) => s + i.amount, 0)
  const totalInvesting = investing.reduce((s, i) => s + i.amount, 0)
  const totalFinancing = financing.reduce((s, i) => s + i.amount, 0)

  const openingLines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: bankAccountIds },
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { lt: startDate },
      },
    },
  })
  const openingBalance = openingLines.reduce((s, l) => s + l.debit - l.credit, 0)

  return NextResponse.json({
    type: "cash-flow",
    period: { from: startDate.toISOString(), to: endDate.toISOString() },
    openingBalance,
    operating: { items: operating, total: totalOperating },
    investing: { items: investing, total: totalInvesting },
    financing: { items: financing, total: totalFinancing },
    netCashFlow: totalOperating + totalInvesting + totalFinancing,
    closingBalance: openingBalance + totalOperating + totalInvesting + totalFinancing,
  })
}

async function handleGST(orgId: string, startDate: Date, endDate: Date) {
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

  const gstLines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: [...gstCollectedIds, ...gstPaidIds] },
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
        date: { gte: startDate, lte: endDate },
      },
    },
    include: { journalEntry: true },
  })

  let gstOnSales = 0
  let gstOnPurchases = 0

  for (const line of gstLines) {
    if (gstCollectedIds.includes(line.accountId)) {
      gstOnSales += line.credit - line.debit
    } else if (gstPaidIds.includes(line.accountId)) {
      gstOnPurchases += line.debit - line.credit
    }
  }

  const fyStartYear = startDate.getFullYear()
  const quarters = [
    { label: "Q1 (Jul-Sep)", start: new Date(fyStartYear, 6, 1), end: new Date(fyStartYear, 8, 30, 23, 59, 59) },
    { label: "Q2 (Oct-Dec)", start: new Date(fyStartYear, 9, 1), end: new Date(fyStartYear, 11, 31, 23, 59, 59) },
    { label: "Q3 (Jan-Mar)", start: new Date(fyStartYear + 1, 0, 1), end: new Date(fyStartYear + 1, 2, 31, 23, 59, 59) },
    { label: "Q4 (Apr-Jun)", start: new Date(fyStartYear + 1, 3, 1), end: new Date(fyStartYear + 1, 5, 30, 23, 59, 59) },
  ]

  const quarterlyData = quarters.map((q) => {
    const qLines = gstLines.filter((l) => {
      const d = new Date(l.journalEntry.date)
      return d >= q.start && d <= q.end
    })
    let qSales = 0
    let qPurchases = 0
    for (const line of qLines) {
      if (gstCollectedIds.includes(line.accountId)) qSales += line.credit - line.debit
      else if (gstPaidIds.includes(line.accountId)) qPurchases += line.debit - line.credit
    }
    return { label: q.label, gstOnSales: qSales, gstOnPurchases: qPurchases, netGST: qSales - qPurchases }
  })

  return NextResponse.json({
    type: "gst",
    period: { from: startDate.toISOString(), to: endDate.toISOString() },
    gstOnSales,
    gstOnPurchases,
    netGST: gstOnSales - gstOnPurchases,
    quarterly: quarterlyData,
  })
}

async function handleRdExpenditure(orgId: string, startDate: Date, endDate: Date) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { aggregatedTurnover: true },
  })

  const isUnder20M = !org?.aggregatedTurnover || org.aggregatedTurnover < 20_000_000
  const offsetRate = isUnder20M ? 0.435 : 0.385

  const rdExpenses = await prisma.rdExpense.findMany({
    where: {
      rdProject: { organizationId: orgId },
      journalLine: {
        journalEntry: {
          status: "Posted",
          date: { gte: startDate, lte: endDate },
        },
      },
    },
    include: {
      journalLine: {
        include: { account: true, journalEntry: true },
      },
      rdProject: true,
      rdActivity: true,
    },
  })

  const byCategory: Record<string, number> = {}
  const byProject: Record<string, { name: string; amount: number }> = {}
  const byActivityType: Record<string, number> = {}
  const byClassification: Record<string, number> = {}

  for (const exp of rdExpenses) {
    const amount = exp.journalLine.debit - exp.journalLine.credit
    const cat = exp.category || "Other"
    byCategory[cat] = (byCategory[cat] || 0) + amount

    if (!byProject[exp.rdProjectId]) {
      byProject[exp.rdProjectId] = { name: exp.rdProject.name, amount: 0 }
    }
    byProject[exp.rdProjectId].amount += amount

    const actType = exp.rdActivity?.activityType || "Unallocated"
    byActivityType[actType] = (byActivityType[actType] || 0) + amount

    const cls = exp.classification || "NeedsReview"
    byClassification[cls] = (byClassification[cls] || 0) + amount
  }

  const totalExpenditure = Object.values(byCategory).reduce((s, v) => s + v, 0)
  const eligibleExpenditure = (byClassification["CoreRD"] || 0) + (byClassification["SupportingRD"] || 0)

  return NextResponse.json({
    type: "rd-expenditure",
    period: { from: startDate.toISOString(), to: endDate.toISOString() },
    totalExpenditure,
    eligibleExpenditure,
    estimatedOffset: eligibleExpenditure * offsetRate,
    offsetRate,
    isUnder20M,
    byCategory,
    byProject: Object.values(byProject),
    byActivityType,
    byClassification,
  })
}
