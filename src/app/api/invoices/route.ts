import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const invoices = await prisma.invoice.findMany({
      where: { organizationId: orgId },
      include: { contact: { select: { name: true } } },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const { contactId, date, dueDate, notes, lines } = body

    if (!contactId || !date || !dueDate || !lines || lines.length === 0) {
      return NextResponse.json(
        { error: "Contact, date, due date, and at least one line item are required" },
        { status: 400 }
      )
    }

    // Calculate totals
    let subtotal = 0
    let taxTotal = 0

    const processedLines = lines.map(
      (line: {
        description: string
        quantity: number
        unitPrice: number
        accountId: string
        taxType: string | null
      }) => {
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
      }
    )

    const total = subtotal + taxTotal

    // Generate invoice number
    const count = await prisma.invoice.count({
      where: { organizationId: orgId },
    })
    const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        contactId,
        date: new Date(date),
        dueDate: new Date(dueDate),
        status: "Draft",
        subtotal,
        taxTotal,
        total,
        notes: notes || null,
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

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
