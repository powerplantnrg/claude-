import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const where: any = { organizationId: orgId }
    if (type) where.type = type
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: { include: { contact: { select: { name: true } } } },
        bill: { include: { contact: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id as string

    const body = await req.json()
    const { type, amount, date, reference, method, invoiceId, billId, notes } = body

    if (!type || !amount || !date || !method) {
      return NextResponse.json(
        { error: "Type, amount, date, and method are required" },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 }
      )
    }

    if (type !== "received" && type !== "made") {
      return NextResponse.json(
        { error: "Type must be 'received' or 'made'" },
        { status: 400 }
      )
    }

    // Validate linked invoice or bill exists
    let contactName = ""
    if (type === "received" && invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, organizationId: orgId },
        include: { contact: { select: { name: true } } },
      })
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
      contactName = invoice.contact.name
    }

    if (type === "made" && billId) {
      const bill = await prisma.bill.findFirst({
        where: { id: billId, organizationId: orgId },
        include: { contact: { select: { name: true } } },
      })
      if (!bill) {
        return NextResponse.json({ error: "Bill not found" }, { status: 404 })
      }
      contactName = bill.contact.name
    }

    // Find system accounts for journal entry
    const bankAccount = await prisma.account.findFirst({
      where: {
        organizationId: orgId,
        type: "Asset",
        name: { contains: "Bank" },
      },
    })

    const arAccount = await prisma.account.findFirst({
      where: {
        organizationId: orgId,
        type: "Asset",
        name: { contains: "Accounts Receivable" },
      },
    })

    const apAccount = await prisma.account.findFirst({
      where: {
        organizationId: orgId,
        type: "Liability",
        name: { contains: "Accounts Payable" },
      },
    })

    // Get next journal entry number
    const lastEntry = await prisma.journalEntry.findFirst({
      where: { organizationId: orgId },
      orderBy: { entryNumber: "desc" },
    })
    const entryNumber = (lastEntry?.entryNumber ?? 0) + 1

    // Create journal entry
    let journalEntryId: string | null = null
    if (bankAccount) {
      const journalLines: {
        accountId: string
        description: string
        debit: number
        credit: number
        taxCode: string | null
      }[] = []

      if (type === "received" && arAccount) {
        // Debit Bank, Credit AR
        journalLines.push({
          accountId: bankAccount.id,
          description: `Payment received${contactName ? ` from ${contactName}` : ""}`,
          debit: amount,
          credit: 0,
          taxCode: null,
        })
        journalLines.push({
          accountId: arAccount.id,
          description: `Payment received${contactName ? ` from ${contactName}` : ""}`,
          debit: 0,
          credit: amount,
          taxCode: null,
        })
      } else if (type === "made" && apAccount) {
        // Debit AP, Credit Bank
        journalLines.push({
          accountId: apAccount.id,
          description: `Payment made${contactName ? ` to ${contactName}` : ""}`,
          debit: amount,
          credit: 0,
          taxCode: null,
        })
        journalLines.push({
          accountId: bankAccount.id,
          description: `Payment made${contactName ? ` to ${contactName}` : ""}`,
          debit: 0,
          credit: amount,
          taxCode: null,
        })
      }

      if (journalLines.length > 0) {
        const journalEntry = await prisma.journalEntry.create({
          data: {
            entryNumber,
            date: new Date(date),
            reference: reference || null,
            narration: `Payment ${type}${contactName ? (type === "received" ? ` from ${contactName}` : ` to ${contactName}`) : ""}`,
            status: "Posted",
            sourceType: "Payment",
            organizationId: orgId,
            lines: { create: journalLines },
          },
        })
        journalEntryId = journalEntry.id
      }
    }

    // Create the payment record
    const payment = await prisma.payment.create({
      data: {
        organizationId: orgId,
        type,
        amount,
        date: new Date(date),
        reference: reference || null,
        method,
        invoiceId: invoiceId || null,
        billId: billId || null,
        journalEntryId,
        notes: notes || null,
      },
      include: {
        invoice: { include: { contact: { select: { name: true } } } },
        bill: { include: { contact: { select: { name: true } } } },
      },
    })

    // Update invoice/bill status and amountDue
    if (type === "received" && invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, organizationId: orgId },
      })
      if (invoice) {
        const currentDue = invoice.amountDue ?? invoice.total
        const newDue = Math.max(0, currentDue - amount)
        const newStatus = newDue <= 0.01 ? "Paid" : "Partially_Paid"
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { amountDue: newDue, status: newStatus },
        })
      }
    }

    if (type === "made" && billId) {
      const bill = await prisma.bill.findFirst({
        where: { id: billId, organizationId: orgId },
      })
      if (bill) {
        const currentDue = bill.amountDue ?? bill.total
        const newDue = Math.max(0, currentDue - amount)
        const newStatus = newDue <= 0.01 ? "Paid" : "Partially_Paid"
        await prisma.bill.update({
          where: { id: billId },
          data: { amountDue: newDue, status: newStatus },
        })
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "Payment",
        entityId: payment.id,
        details: `Recorded ${type} payment of $${amount.toFixed(2)} via ${method}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error("Error recording payment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
