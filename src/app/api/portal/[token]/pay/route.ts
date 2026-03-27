import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate portal token - no auth required
    const portalToken = await prisma.customerPortalToken.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: { contact: true },
    })

    if (!portalToken) {
      return NextResponse.json(
        { error: "Invalid or expired portal link" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { invoiceId, payerEmail, payerName } = body

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      )
    }

    // Verify the invoice belongs to this contact and is outstanding
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        contactId: portalToken.contactId,
        organizationId: portalToken.organizationId,
        status: { in: ["Sent", "Overdue"] },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found or not payable" },
        { status: 404 }
      )
    }

    // Simulate payment processing
    const transactionId = `txn_${randomUUID().replace(/-/g, "").slice(0, 16)}`

    const payment = await prisma.onlinePayment.create({
      data: {
        invoiceId: invoice.id,
        organizationId: portalToken.organizationId,
        gateway: "stripe_simulated",
        transactionId,
        amount: invoice.amountDue ?? invoice.total,
        currency: "AUD",
        status: "Completed",
        paidAt: new Date(),
        gatewayResponse: JSON.stringify({
          simulated: true,
          transactionId,
          timestamp: new Date().toISOString(),
        }),
        payerEmail: payerEmail || portalToken.contact.email || null,
        payerName: payerName || portalToken.contact.name || null,
      },
    })

    // Update invoice status to Paid
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "Paid",
        amountDue: 0,
      },
    })

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paidAt: payment.paidAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Error processing payment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
