import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface TransactionInput {
  date: string
  description: string
  amount: string | number
  reference?: string
}

interface ImportError {
  row: number
  message: string
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string

  let transactions: TransactionInput[]
  try {
    const body = await request.json()
    transactions = body.transactions
    if (!Array.isArray(transactions)) {
      return NextResponse.json(
        { error: "Request body must contain a 'transactions' array" },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Fetch existing transactions for duplicate detection
  const existingTransactions = await prisma.bankTransaction.findMany({
    where: { organizationId: orgId },
    select: { date: true, amount: true, description: true },
  })

  // Build a set of existing transaction keys for fast lookup
  const existingKeys = new Set(
    existingTransactions.map(
      (t) =>
        `${t.date.toISOString().slice(0, 10)}|${t.amount}|${t.description.toLowerCase().trim()}`
    )
  )

  const errors: ImportError[] = []
  let imported = 0
  let duplicates = 0

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    const rowNum = i + 1

    // Validate date
    if (!tx.date) {
      errors.push({ row: rowNum, message: "Missing date" })
      continue
    }
    const parsedDate = new Date(tx.date)
    if (isNaN(parsedDate.getTime())) {
      errors.push({ row: rowNum, message: `Invalid date format: "${tx.date}"` })
      continue
    }

    // Validate amount
    const amount =
      typeof tx.amount === "number"
        ? tx.amount
        : parseFloat(String(tx.amount).replace(/[$,]/g, ""))
    if (isNaN(amount)) {
      errors.push({ row: rowNum, message: `Invalid amount: "${tx.amount}"` })
      continue
    }

    // Validate description
    const description = (tx.description || "").trim()
    if (!description) {
      errors.push({ row: rowNum, message: "Missing description" })
      continue
    }

    // Duplicate detection
    const dateKey = parsedDate.toISOString().slice(0, 10)
    const key = `${dateKey}|${amount}|${description.toLowerCase().trim()}`
    if (existingKeys.has(key)) {
      duplicates++
      continue
    }

    try {
      await prisma.bankTransaction.create({
        data: {
          date: parsedDate,
          description,
          amount,
          reference: tx.reference?.trim() || null,
          organizationId: orgId,
        },
      })
      imported++
      // Add to set so subsequent rows in same import batch are also deduplicated
      existingKeys.add(key)
    } catch (err) {
      errors.push({
        row: rowNum,
        message: `Database error: ${err instanceof Error ? err.message : "Unknown error"}`,
      })
    }
  }

  // Audit log
  if (imported > 0) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "Import",
        entityType: "BankTransaction",
        details: `Imported ${imported} bank transactions (${duplicates} duplicates skipped, ${errors.length} errors)`,
        organizationId: orgId,
      },
    })
  }

  return NextResponse.json({ imported, duplicates, errors })
}
