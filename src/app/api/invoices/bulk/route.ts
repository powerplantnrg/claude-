import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const userId = session.user.id

  let body: { action: string; invoiceIds: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { action, invoiceIds } = body

  if (!action || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return NextResponse.json(
      { error: "action and invoiceIds[] are required" },
      { status: 400 }
    )
  }

  const validActions = ["mark-sent", "mark-paid"]
  if (!validActions.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
      { status: 400 }
    )
  }

  // Fetch all requested invoices
  const invoices = await prisma.invoice.findMany({
    where: { id: { in: invoiceIds }, organizationId: orgId },
    include: { lines: { include: { account: true } } },
  })

  if (invoices.length === 0) {
    return NextResponse.json(
      { error: "No matching invoices found" },
      { status: 404 }
    )
  }

  const validTransitions: Record<string, string[]> = {
    Draft: ["Sent", "Void"],
    Sent: ["Paid", "Void"],
    Paid: [],
    Overdue: ["Paid", "Void"],
    Void: [],
  }

  const targetStatus = action === "mark-sent" ? "Sent" : "Paid"
  const updated: string[] = []
  const errors: { id: string; invoiceNumber: string; message: string }[] = []

  for (const invoice of invoices) {
    const allowed = validTransitions[invoice.status] || []
    if (!allowed.includes(targetStatus)) {
      errors.push({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        message: `Cannot transition from "${invoice.status}" to "${targetStatus}"`,
      })
      continue
    }

    // If marking as Sent, create journal entries
    if (targetStatus === "Sent") {
      const arAccount = await prisma.account.findFirst({
        where: {
          organizationId: orgId,
          type: "Asset",
          name: { contains: "Accounts Receivable" },
        },
      })

      const gstCollectedAccount = await prisma.account.findFirst({
        where: {
          organizationId: orgId,
          type: "Liability",
          name: { contains: "GST" },
        },
      })

      if (arAccount) {
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

        journalLines.push({
          accountId: arAccount.id,
          description: `Invoice ${invoice.invoiceNumber} - Accounts Receivable`,
          debit: invoice.total,
          credit: 0,
          taxCode: null,
        })

        for (const line of invoice.lines) {
          journalLines.push({
            accountId: line.accountId,
            description: `Invoice ${invoice.invoiceNumber} - ${line.description}`,
            debit: 0,
            credit: line.amount,
            taxCode: line.taxType,
          })
        }

        if (invoice.taxTotal > 0 && gstCollectedAccount) {
          journalLines.push({
            accountId: gstCollectedAccount.id,
            description: `Invoice ${invoice.invoiceNumber} - GST Collected`,
            debit: 0,
            credit: invoice.taxTotal,
            taxCode: "GST",
          })
        }

        await prisma.journalEntry.create({
          data: {
            entryNumber,
            date: invoice.date,
            reference: invoice.invoiceNumber,
            narration: `Invoice ${invoice.invoiceNumber} sent to ${invoice.contactId}`,
            status: "Posted",
            sourceType: "Invoice",
            sourceId: invoice.id,
            organizationId: orgId,
            lines: { create: journalLines },
          },
        })
      }
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: targetStatus },
    })
    updated.push(invoice.id)
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: `Bulk ${targetStatus}`,
      entityType: "Invoice",
      details: `Bulk ${action}: ${updated.length} updated, ${errors.length} failed`,
      organizationId: orgId,
    },
  })

  return NextResponse.json({
    action,
    updated: updated.length,
    failed: errors.length,
    errors,
  })
}
