import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface ImportRow {
  code: string
  name: string
  type: string
  subType?: string
  taxType?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    let body: { accounts: ImportRow[] }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { accounts } = body
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json(
        { error: "Request must include a non-empty 'accounts' array" },
        { status: 400 }
      )
    }

    const validTypes = ["Asset", "Liability", "Equity", "Revenue", "Expense"]
    const errors: { row: number; message: string }[] = []
    const validRows: ImportRow[] = []

    // Fetch existing codes for this org
    const existingAccounts = await prisma.account.findMany({
      where: { organizationId: orgId },
      select: { code: true },
    })
    const existingCodes = new Set(existingAccounts.map((a) => a.code))

    // Track codes within the import batch for intra-batch duplicate detection
    const batchCodes = new Set<string>()

    for (let i = 0; i < accounts.length; i++) {
      const row = accounts[i]

      if (!row.code || !row.name || !row.type) {
        errors.push({
          row: i + 1,
          message: "Fields 'code', 'name', and 'type' are required",
        })
        continue
      }

      if (!validTypes.includes(row.type)) {
        errors.push({
          row: i + 1,
          message: `Invalid type '${row.type}'. Must be one of: ${validTypes.join(", ")}`,
        })
        continue
      }

      if (existingCodes.has(row.code)) {
        errors.push({
          row: i + 1,
          message: `Account code '${row.code}' already exists in the organization`,
        })
        continue
      }

      if (batchCodes.has(row.code)) {
        errors.push({
          row: i + 1,
          message: `Duplicate code '${row.code}' within the import batch`,
        })
        continue
      }

      batchCodes.add(row.code)
      validRows.push(row)
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid accounts to import",
          errors,
          imported: 0,
        },
        { status: 400 }
      )
    }

    // Bulk create
    const created = await prisma.account.createMany({
      data: validRows.map((row) => ({
        code: row.code,
        name: row.name,
        type: row.type,
        subType: row.subType || null,
        taxType: row.taxType || null,
        organizationId: orgId,
      })),
    })

    return NextResponse.json({
      imported: created.count,
      errors,
      total: accounts.length,
    })
  } catch (error) {
    console.error("Error importing accounts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
