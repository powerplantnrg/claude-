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
  const reconciled = searchParams.get("reconciled")
  const limit = parseInt(searchParams.get("limit") || "200")

  const where: Record<string, unknown> = { organizationId: orgId }
  if (reconciled === "true") where.reconciled = true
  if (reconciled === "false") where.reconciled = false

  const transactions = await prisma.bankTransaction.findMany({
    where,
    include: {
      matchedJournal: {
        include: { lines: { include: { account: true } } },
      },
    },
    orderBy: { date: "desc" },
    take: limit,
  })

  return NextResponse.json(transactions)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const userId = session.user.id
  const body = await request.json()

  // Handle reconciliation
  if (body.reconcile) {
    const { transactionId, journalId } = body.reconcile

    const transaction = await prisma.bankTransaction.findFirst({
      where: { id: transactionId, organizationId: orgId },
    })
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }
    if (transaction.reconciled) {
      return NextResponse.json({ error: "Transaction already reconciled" }, { status: 400 })
    }

    const journal = await prisma.journalEntry.findFirst({
      where: { id: journalId, organizationId: orgId },
    })
    if (!journal) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 })
    }

    const existingMatch = await prisma.bankTransaction.findFirst({
      where: { matchedJournalId: journalId, organizationId: orgId },
    })
    if (existingMatch) {
      return NextResponse.json(
        { error: "Journal entry already matched to another transaction" },
        { status: 400 }
      )
    }

    const updated = await prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        reconciled: true,
        matchedJournalId: journalId,
      },
      include: {
        matchedJournal: {
          include: { lines: { include: { account: true } } },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Reconcile",
        entityType: "BankTransaction",
        entityId: transactionId,
        details: `Reconciled bank transaction with journal entry #${journal.entryNumber}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(updated)
  }

  // Handle bulk import of transactions
  if (body.transactions && Array.isArray(body.transactions)) {
    const created = []
    for (const tx of body.transactions) {
      const transaction = await prisma.bankTransaction.create({
        data: {
          date: new Date(tx.date),
          description: tx.description || "",
          amount: typeof tx.amount === "number" ? tx.amount : parseFloat(tx.amount) || 0,
          reference: tx.reference || null,
          organizationId: orgId,
        },
      })
      created.push(transaction)
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Import",
        entityType: "BankTransaction",
        details: `Imported ${created.length} bank transactions`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(created, { status: 201 })
  }

  // Handle single transaction creation
  const { date, description, amount, reference } = body
  if (!date || amount === undefined) {
    return NextResponse.json(
      { error: "Date and amount are required" },
      { status: 400 }
    )
  }

  const transaction = await prisma.bankTransaction.create({
    data: {
      date: new Date(date),
      description: description || "",
      amount: typeof amount === "number" ? amount : parseFloat(amount) || 0,
      reference: reference || null,
      organizationId: orgId,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: "Create",
      entityType: "BankTransaction",
      entityId: transaction.id,
      details: `Created bank transaction: ${description}`,
      organizationId: orgId,
    },
  })

  return NextResponse.json(transaction, { status: 201 })
}
