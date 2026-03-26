import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string

  const creditNotes = await prisma.creditNote.findMany({
    where: { organizationId: orgId },
    include: {
      contact: { select: { id: true, name: true } },
      lines: true,
    },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(creditNotes)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const body = await request.json()

  const { contactId, date, invoiceId, reason, notes, lines } = body

  if (!contactId || !date || !lines || lines.length === 0) {
    return NextResponse.json(
      { error: "Contact, date, and at least one line item are required" },
      { status: 400 }
    )
  }

  // Generate credit note number
  const count = await prisma.creditNote.count({
    where: { organizationId: orgId },
  })
  const creditNoteNumber = `CN-${String(count + 1).padStart(4, "0")}`

  // Calculate totals
  let subtotal = 0
  let taxTotal = 0

  const processedLines = lines.map(
    (line: {
      description: string
      quantity: number
      unitPrice: number
      accountId: string
      taxType: string
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
        taxType: line.taxType || "GST",
        amount: lineAmount,
        taxAmount: lineTax,
      }
    }
  )

  const total = subtotal + taxTotal

  const creditNote = await prisma.creditNote.create({
    data: {
      organizationId: orgId,
      creditNoteNumber,
      contactId,
      invoiceId: invoiceId || null,
      date: new Date(date),
      subtotal,
      taxTotal,
      total,
      reason: reason || null,
      notes: notes || null,
      lines: {
        create: processedLines,
      },
    },
    include: {
      contact: { select: { id: true, name: true } },
      lines: true,
    },
  })

  return NextResponse.json(creditNote, { status: 201 })
}
