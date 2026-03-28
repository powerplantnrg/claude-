import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: {
        contact: true,
        lines: { include: { account: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: { lines: { include: { account: true } } },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const body = await request.json()
    const { status, contactId, date, dueDate, notes, lines: newLines } = body

    // If editing fields (not a status transition), only allow for Draft invoices
    if (newLines !== undefined) {
      if (invoice.status !== "Draft") {
        return NextResponse.json(
          { error: "Only Draft invoices can be edited." },
          { status: 400 }
        )
      }

      // Calculate totals from line items
      const lineData = (newLines as any[]).map((l) => {
        const amount = l.quantity * l.unitPrice
        const tax = l.taxType === "GST" ? amount * 0.1 : 0
        return { ...l, amount, tax }
      })

      const subtotal = lineData.reduce((sum: number, l: any) => sum + l.amount, 0)
      const taxTotal = lineData.reduce((sum: number, l: any) => sum + l.tax, 0)
      const total = subtotal + taxTotal

      // Delete existing lines and recreate
      await prisma.invoiceLine.deleteMany({ where: { invoiceId: id } })

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          contactId,
          date: new Date(date),
          dueDate: new Date(dueDate),
          notes: notes || null,
          subtotal,
          taxTotal,
          total,
          amountDue: total,
          lines: {
            create: lineData.map((l: any) => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              accountId: l.accountId,
              taxType: l.taxType,
              amount: l.amount,
            })),
          },
        },
        include: {
          contact: true,
          lines: { include: { account: true } },
        },
      })

      return NextResponse.json(updated)
    }

    // Status transition logic
    const validTransitions: Record<string, string[]> = {
      Draft: ["Sent", "Void"],
      Sent: ["Paid", "Void"],
      Paid: [],
      Overdue: ["Paid", "Void"],
      Void: [],
    }

    if (!validTransitions[invoice.status]?.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from "${invoice.status}" to "${status}"`,
        },
        { status: 400 }
      )
    }

    // If marking as "Sent", create journal entries
    if (status === "Sent") {
      // Find or use system accounts for AR, Revenue, and GST Collected
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
        // Get the next entry number
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

        // Debit Accounts Receivable for the total
        journalLines.push({
          accountId: arAccount.id,
          description: `Invoice ${invoice.invoiceNumber} - Accounts Receivable`,
          debit: invoice.total,
          credit: 0,
          taxCode: null,
        })

        // Credit Revenue accounts for each line
        for (const line of invoice.lines) {
          journalLines.push({
            accountId: line.accountId,
            description: `Invoice ${invoice.invoiceNumber} - ${line.description}`,
            debit: 0,
            credit: line.amount,
            taxCode: line.taxType,
          })
        }

        // Credit GST Collected if there is tax
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

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status },
      include: {
        contact: true,
        lines: { include: { account: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating invoice:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
