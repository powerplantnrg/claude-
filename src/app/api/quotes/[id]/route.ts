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

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: orgId },
      include: {
        contact: true,
        lines: {
          include: { taxRate: true, account: true },
          orderBy: { sortOrder: "asc" },
        },
        convertedInvoice: true,
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error("Error fetching quote:", error)
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
    const { id } = await params

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: orgId },
      include: { lines: true },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body

    // Handle specific actions
    if (action === "send") {
      if (quote.status !== "Draft") {
        return NextResponse.json(
          { error: "Only Draft quotes can be sent" },
          { status: 400 }
        )
      }
      const updated = await prisma.quote.update({
        where: { id },
        data: { status: "Sent" },
        include: { contact: true, lines: { include: { taxRate: true, account: true } } },
      })
      return NextResponse.json(updated)
    }

    if (action === "accept") {
      if (quote.status !== "Sent") {
        return NextResponse.json(
          { error: "Only Sent quotes can be accepted" },
          { status: 400 }
        )
      }
      const updated = await prisma.quote.update({
        where: { id },
        data: {
          status: "Accepted",
          acceptedAt: new Date(),
          acceptedByName: body.acceptedByName || null,
          acceptedByEmail: body.acceptedByEmail || null,
        },
        include: { contact: true, lines: { include: { taxRate: true, account: true } } },
      })
      return NextResponse.json(updated)
    }

    if (action === "decline") {
      if (quote.status !== "Sent") {
        return NextResponse.json(
          { error: "Only Sent quotes can be declined" },
          { status: 400 }
        )
      }
      const updated = await prisma.quote.update({
        where: { id },
        data: { status: "Declined" },
        include: { contact: true, lines: { include: { taxRate: true, account: true } } },
      })
      return NextResponse.json(updated)
    }

    if (action === "convert") {
      if (quote.status !== "Accepted") {
        return NextResponse.json(
          { error: "Only Accepted quotes can be converted to invoices" },
          { status: 400 }
        )
      }

      // Generate invoice number
      const invoiceCount = await prisma.invoice.count({
        where: { organizationId: orgId },
      })
      const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, "0")}`

      // Create invoice from quote
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          contactId: quote.contactId,
          date: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: "Draft",
          subtotal: quote.subtotal,
          taxTotal: quote.taxTotal,
          total: quote.total,
          amountDue: quote.total,
          notes: quote.notes,
          organizationId: orgId,
          lines: {
            create: quote.lines.map((line) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              accountId: line.accountId,
              taxType: line.taxRateId ? "GST" : null,
              amount: line.lineAmount,
            })),
          },
        },
      })

      // Update quote with converted invoice reference
      const updated = await prisma.quote.update({
        where: { id },
        data: {
          status: "Converted",
          convertedInvoiceId: invoice.id,
        },
        include: { contact: true, lines: { include: { taxRate: true, account: true } }, convertedInvoice: true },
      })

      return NextResponse.json(updated)
    }

    // General update (only for Draft quotes)
    if (quote.status !== "Draft") {
      return NextResponse.json(
        { error: "Only Draft quotes can be edited" },
        { status: 400 }
      )
    }

    const { contactId, issueDate, expiryDate, reference, notes, terms, lines: newLines } = body

    if (newLines !== undefined) {
      let subtotal = 0
      let taxTotal = 0

      const processedLines = (newLines as any[]).map((line, index) => {
        const lineAmount = line.quantity * line.unitPrice
        const lineTax = line.taxRateId ? lineAmount * 0.1 : 0
        subtotal += lineAmount
        taxTotal += lineTax
        return {
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          accountId: line.accountId,
          taxRateId: line.taxRateId || null,
          taxAmount: lineTax,
          lineAmount,
          sortOrder: line.sortOrder ?? index,
        }
      })

      const total = subtotal + taxTotal

      // Delete existing lines and recreate
      await prisma.quoteLine.deleteMany({ where: { quoteId: id } })

      const updated = await prisma.quote.update({
        where: { id },
        data: {
          contactId: contactId || quote.contactId,
          issueDate: issueDate ? new Date(issueDate) : quote.issueDate,
          expiryDate: expiryDate ? new Date(expiryDate) : quote.expiryDate,
          reference: reference !== undefined ? reference : quote.reference,
          notes: notes !== undefined ? notes : quote.notes,
          terms: terms !== undefined ? terms : quote.terms,
          subtotal,
          taxTotal,
          total,
          lines: { create: processedLines },
        },
        include: {
          contact: true,
          lines: { include: { taxRate: true, account: true }, orderBy: { sortOrder: "asc" } },
        },
      })

      return NextResponse.json(updated)
    }

    // Update header fields only
    const updated = await prisma.quote.update({
      where: { id },
      data: {
        ...(contactId && { contactId }),
        ...(issueDate && { issueDate: new Date(issueDate) }),
        ...(expiryDate && { expiryDate: new Date(expiryDate) }),
        ...(reference !== undefined && { reference }),
        ...(notes !== undefined && { notes }),
        ...(terms !== undefined && { terms }),
      },
      include: {
        contact: true,
        lines: { include: { taxRate: true, account: true }, orderBy: { sortOrder: "asc" } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating quote:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
