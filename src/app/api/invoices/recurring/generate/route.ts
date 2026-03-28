import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function calculateNextDate(current: Date, frequency: string, dayOfMonth?: number | null): Date {
  const next = new Date(current)
  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7)
      break
    case "fortnightly":
      next.setDate(next.getDate() + 14)
      break
    case "monthly":
      next.setMonth(next.getMonth() + 1)
      if (dayOfMonth) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        next.setDate(Math.min(dayOfMonth, maxDay))
      }
      break
    case "quarterly":
      next.setMonth(next.getMonth() + 3)
      if (dayOfMonth) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        next.setDate(Math.min(dayOfMonth, maxDay))
      }
      break
    case "annually":
      next.setFullYear(next.getFullYear() + 1)
      break
  }
  return next
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const { recurringInvoiceId } = body

    if (!recurringInvoiceId) {
      return NextResponse.json(
        { error: "recurringInvoiceId is required" },
        { status: 400 }
      )
    }

    const recurring = await prisma.recurringInvoice.findFirst({
      where: { id: recurringInvoiceId, organizationId: orgId },
    })

    if (!recurring) {
      return NextResponse.json(
        { error: "Recurring invoice not found" },
        { status: 404 }
      )
    }

    if (!recurring.isActive) {
      return NextResponse.json(
        { error: "Recurring invoice is paused" },
        { status: 400 }
      )
    }

    // Check if past end date
    if (recurring.endDate && recurring.nextDate > recurring.endDate) {
      return NextResponse.json(
        { error: "Recurring invoice has passed its end date" },
        { status: 400 }
      )
    }

    // Parse template data
    let template: {
      lines: Array<{
        description: string
        quantity: number
        unitPrice: number
        accountId: string
        taxType: string | null
      }>
      notes?: string
    }
    try {
      template = JSON.parse(recurring.templateData)
    } catch {
      return NextResponse.json(
        { error: "Invalid template data" },
        { status: 400 }
      )
    }

    // Calculate totals from template
    let subtotal = 0
    let taxTotal = 0

    const processedLines = (template.lines || []).map((line) => {
      const lineAmount = line.quantity * line.unitPrice
      const lineTax = line.taxType === "GST" ? lineAmount * 0.1 : 0
      subtotal += lineAmount
      taxTotal += lineTax
      return {
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        accountId: line.accountId,
        taxType: line.taxType || null,
        amount: lineAmount,
      }
    })

    const total = subtotal + taxTotal

    // Generate invoice number
    const count = await prisma.invoice.count({
      where: { organizationId: orgId },
    })
    const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`

    // Set due date 30 days from invoice date
    const invoiceDate = recurring.nextDate
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + 30)

    // Create the invoice and update the recurring record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          contactId: recurring.contactId,
          date: invoiceDate,
          dueDate,
          status: "Draft",
          subtotal,
          taxTotal,
          total,
          notes: template.notes || null,
          organizationId: orgId,
          lines: {
            create: processedLines,
          },
        },
        include: {
          contact: { select: { name: true } },
          lines: true,
        },
      })

      // Update the recurring invoice
      const nextDate = calculateNextDate(recurring.nextDate, recurring.frequency, recurring.dayOfMonth)
      await tx.recurringInvoice.update({
        where: { id: recurringInvoiceId },
        data: {
          lastGenerated: new Date(),
          invoiceCount: { increment: 1 },
          nextDate,
        },
      })

      return invoice
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error generating invoice from recurring template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
