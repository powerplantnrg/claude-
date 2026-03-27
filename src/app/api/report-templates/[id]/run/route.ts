import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface ColumnConfig {
  key: string
  label: string
  type?: string
}

interface FilterConfig {
  accountTypes?: string[]
  costCenters?: string[]
  accountIds?: string[]
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const { id } = await params

    // Allow overrides from the request body
    const body = await req.json().catch(() => ({}))
    const { from: overrideFrom, to: overrideTo } = body

    const template = await prisma.reportTemplate.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const columns: ColumnConfig[] = JSON.parse(template.columns || "[]")
    const filters: FilterConfig = JSON.parse(template.filters || "{}")
    const baseReport = template.baseReport

    // Determine date range
    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (overrideFrom && overrideTo) {
      startDate = new Date(overrideFrom)
      endDate = new Date(overrideTo)
    } else if (template.dateRange) {
      // dateRange could be "FY2025", "2024-07-01:2025-06-30", "last12months", etc.
      const dr = template.dateRange
      if (dr.startsWith("FY")) {
        const fy = parseInt(dr.replace("FY", ""), 10)
        startDate = new Date(fy - 1, 6, 1)
        endDate = new Date(fy, 5, 30, 23, 59, 59)
      } else if (dr.includes(":")) {
        const [s, e] = dr.split(":")
        startDate = new Date(s)
        endDate = new Date(e)
      } else {
        // Default to current FY
        const fyEnd = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
        startDate = new Date(fyEnd - 1, 6, 1)
        endDate = new Date(fyEnd, 5, 30, 23, 59, 59)
      }
    } else {
      const fyEnd = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
      startDate = new Date(fyEnd - 1, 6, 1)
      endDate = new Date(fyEnd, 5, 30, 23, 59, 59)
    }

    // Build the where clause for journal lines
    const journalLineWhere: any = {
      journalEntry: {
        organizationId: orgId,
        status: "Posted",
      },
    }

    // For P&L reports, restrict to date range
    // For Balance Sheet, use all time up to endDate
    if (baseReport === "BalanceSheet") {
      journalLineWhere.journalEntry.date = { lte: endDate }
    } else {
      journalLineWhere.journalEntry.date = { gte: startDate, lte: endDate }
    }

    // Apply account type filters
    if (baseReport === "ProfitLoss") {
      journalLineWhere.account = { type: { in: ["Revenue", "Expense"] } }
    } else if (baseReport === "BalanceSheet") {
      journalLineWhere.account = { type: { in: ["Asset", "Liability", "Equity"] } }
    }

    // Apply custom filters
    if (filters.accountTypes && filters.accountTypes.length > 0) {
      journalLineWhere.account = {
        ...journalLineWhere.account,
        type: { in: filters.accountTypes },
      }
    }
    if (filters.accountIds && filters.accountIds.length > 0) {
      journalLineWhere.account = {
        ...journalLineWhere.account,
        id: { in: filters.accountIds },
      }
    }

    // Fetch journal lines
    const journalLines = await prisma.journalLine.findMany({
      where: journalLineWhere,
      include: {
        account: true,
        journalEntry: { select: { date: true, narration: true } },
      },
    })

    // Aggregate by account
    const accountMap: Record<string, {
      accountId: string
      code: string
      name: string
      type: string
      subType: string | null
      debit: number
      credit: number
      balance: number
    }> = {}

    for (const line of journalLines) {
      if (!accountMap[line.accountId]) {
        accountMap[line.accountId] = {
          accountId: line.accountId,
          code: line.account.code,
          name: line.account.name,
          type: line.account.type,
          subType: line.account.subType || null,
          debit: 0,
          credit: 0,
          balance: 0,
        }
      }
      accountMap[line.accountId].debit += line.debit
      accountMap[line.accountId].credit += line.credit
    }

    // Calculate balances
    for (const acct of Object.values(accountMap)) {
      if (acct.type === "Revenue") {
        acct.balance = acct.credit - acct.debit
      } else if (acct.type === "Expense") {
        acct.balance = acct.debit - acct.credit
      } else if (acct.type === "Asset") {
        acct.balance = acct.debit - acct.credit
      } else {
        // Liability, Equity
        acct.balance = acct.credit - acct.debit
      }
    }

    let rows = Object.values(accountMap).filter((a) => Math.abs(a.balance) > 0.01)

    // Fetch comparison data if needed
    let comparisonRows: typeof rows = []
    if (template.includeComparison) {
      const compStart = new Date(startDate)
      const compEnd = new Date(endDate)
      compStart.setFullYear(compStart.getFullYear() - 1)
      compEnd.setFullYear(compEnd.getFullYear() - 1)

      const compWhere = JSON.parse(JSON.stringify(journalLineWhere))
      if (baseReport === "BalanceSheet") {
        compWhere.journalEntry.date = { lte: compEnd }
      } else {
        compWhere.journalEntry.date = { gte: compStart, lte: compEnd }
      }

      const compLines = await prisma.journalLine.findMany({
        where: compWhere,
        include: { account: true },
      })

      const compAccountMap: Record<string, typeof rows[0]> = {}
      for (const line of compLines) {
        if (!compAccountMap[line.accountId]) {
          compAccountMap[line.accountId] = {
            accountId: line.accountId,
            code: line.account.code,
            name: line.account.name,
            type: line.account.type,
            subType: line.account.subType || null,
            debit: 0,
            credit: 0,
            balance: 0,
          }
        }
        compAccountMap[line.accountId].debit += line.debit
        compAccountMap[line.accountId].credit += line.credit
      }

      for (const acct of Object.values(compAccountMap)) {
        if (acct.type === "Revenue") acct.balance = acct.credit - acct.debit
        else if (acct.type === "Expense") acct.balance = acct.debit - acct.credit
        else if (acct.type === "Asset") acct.balance = acct.debit - acct.credit
        else acct.balance = acct.credit - acct.debit
      }

      comparisonRows = Object.values(compAccountMap).filter((a) => Math.abs(a.balance) > 0.01)
    }

    // Group rows if needed
    let groupedData: any = null
    if (template.groupBy) {
      const groups: Record<string, { label: string; rows: typeof rows; total: number }> = {}
      for (const row of rows) {
        const key =
          template.groupBy === "accountType"
            ? row.type
            : template.groupBy === "costCenter"
            ? row.subType || "Uncategorized"
            : template.groupBy === "month"
            ? "all" // Month grouping requires different approach
            : row.type
        if (!groups[key]) {
          groups[key] = { label: key, rows: [], total: 0 }
        }
        groups[key].rows.push(row)
        groups[key].total += row.balance
      }
      groupedData = Object.values(groups)
    }

    // Sort rows
    rows.sort((a, b) => a.code.localeCompare(b.code))

    // Build column data for each row
    const formattedRows = rows.map((row) => {
      const compRow = comparisonRows.find((c) => c.accountId === row.accountId)
      const result: Record<string, any> = {
        accountId: row.accountId,
        code: row.code,
        name: row.name,
        type: row.type,
        subType: row.subType,
      }

      for (const col of columns) {
        switch (col.key) {
          case "account":
            result.account = `${row.code} - ${row.name}`
            break
          case "amount":
            result.amount = row.balance
            break
          case "debit":
            result.debit = row.debit
            break
          case "credit":
            result.credit = row.credit
            break
          case "budget":
            result.budget = 0 // Would need budget integration
            break
          case "variance":
            result.variance = row.balance - (compRow?.balance || 0)
            break
          case "percentage":
            result.percentage = compRow?.balance
              ? ((row.balance - compRow.balance) / Math.abs(compRow.balance)) * 100
              : null
            break
          case "priorPeriod":
            result.priorPeriod = compRow?.balance || 0
            break
        }
      }

      return result
    })

    // Calculate totals
    const totals: Record<string, number> = {}
    for (const col of columns) {
      if (["amount", "budget", "variance", "priorPeriod", "debit", "credit"].includes(col.key)) {
        totals[col.key] = formattedRows.reduce((sum, r) => sum + (r[col.key] || 0), 0)
      }
    }

    return NextResponse.json({
      templateId: template.id,
      templateName: template.name,
      baseReport,
      period: { from: startDate.toISOString(), to: endDate.toISOString() },
      columns,
      rows: formattedRows,
      totals,
      groupedData,
      rowCount: formattedRows.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error running report template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
