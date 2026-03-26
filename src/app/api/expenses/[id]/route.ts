import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const claim = await prisma.expenseClaim.findFirst({
      where: { id, organizationId: orgId },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            rdProject: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!claim) {
      return NextResponse.json({ error: "Expense claim not found" }, { status: 404 })
    }

    return NextResponse.json(claim)
  } catch (error) {
    console.error("Error fetching expense claim:", error)
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
    const userId = (session.user as any).id as string
    const { id } = await params

    const claim = await prisma.expenseClaim.findFirst({
      where: { id, organizationId: orgId },
      include: { items: true },
    })

    if (!claim) {
      return NextResponse.json({ error: "Expense claim not found" }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body // submit, approve, reject, pay

    const validTransitions: Record<string, string[]> = {
      Draft: ["Submitted"],
      Submitted: ["Approved", "Rejected"],
      Approved: ["Paid"],
      Paid: [],
      Rejected: [],
    }

    const statusMap: Record<string, string> = {
      submit: "Submitted",
      approve: "Approved",
      reject: "Rejected",
      pay: "Paid",
    }

    const newStatus = statusMap[action]
    if (!newStatus) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (!validTransitions[claim.status]?.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from "${claim.status}" to "${newStatus}"` },
        { status: 400 }
      )
    }

    // When paying, create journal entry
    if (action === "pay") {
      const bankAccount = await prisma.account.findFirst({
        where: {
          organizationId: orgId,
          type: "Asset",
          name: { contains: "Bank" },
        },
      })

      // Find a general expense account as fallback
      const expenseAccount = await prisma.account.findFirst({
        where: {
          organizationId: orgId,
          type: "Expense",
        },
      })

      if (bankAccount && expenseAccount) {
        const lastEntry = await prisma.journalEntry.findFirst({
          where: { organizationId: orgId },
          orderBy: { entryNumber: "desc" },
        })
        const entryNumber = (lastEntry?.entryNumber ?? 0) + 1

        const journalLines: {
          accountId: string
          description: string
          debit: number
          credit: number
          taxCode: string | null
        }[] = []

        // Debit expense accounts for each item
        for (const item of claim.items) {
          journalLines.push({
            accountId: item.accountId || expenseAccount.id,
            description: `Expense claim ${claim.claimNumber} - ${item.description}`,
            debit: item.amount + item.taxAmount,
            credit: 0,
            taxCode: item.taxAmount > 0 ? "GST" : null,
          })
        }

        // Credit bank for total
        journalLines.push({
          accountId: bankAccount.id,
          description: `Expense claim ${claim.claimNumber} payment`,
          debit: 0,
          credit: claim.totalAmount,
          taxCode: null,
        })

        await prisma.journalEntry.create({
          data: {
            entryNumber,
            date: new Date(),
            reference: claim.claimNumber,
            narration: `Expense claim ${claim.claimNumber} payment`,
            status: "Posted",
            sourceType: "ExpenseClaim",
            sourceId: claim.id,
            organizationId: orgId,
            lines: { create: journalLines },
          },
        })
      }
    }

    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: { status: newStatus },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            rdProject: { select: { id: true, name: true } },
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: action.charAt(0).toUpperCase() + action.slice(1),
        entityType: "ExpenseClaim",
        entityId: claim.id,
        details: `${action} expense claim ${claim.claimNumber}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating expense claim:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
