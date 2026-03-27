import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Look up the portal token - no auth required
    const portalToken = await prisma.customerPortalToken.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        contact: true,
      },
    })

    if (!portalToken) {
      return NextResponse.json(
        { error: "Invalid or expired portal link" },
        { status: 404 }
      )
    }

    // Update last accessed time
    await prisma.customerPortalToken.update({
      where: { id: portalToken.id },
      data: { lastAccessedAt: new Date() },
    })

    // Get outstanding invoices for this contact
    const invoices = await prisma.invoice.findMany({
      where: {
        contactId: portalToken.contactId,
        organizationId: portalToken.organizationId,
        status: { in: ["Sent", "Overdue"] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        date: true,
        dueDate: true,
        total: true,
        amountDue: true,
        status: true,
      },
      orderBy: { dueDate: "asc" },
    })

    // Get payment history
    const payments = await prisma.onlinePayment.findMany({
      where: {
        organizationId: portalToken.organizationId,
        invoice: { contactId: portalToken.contactId },
      },
      include: {
        invoice: {
          select: { invoiceNumber: true },
        },
      },
      orderBy: { paidAt: "desc" },
    })

    return NextResponse.json({
      contact: {
        name: portalToken.contact.name,
        email: portalToken.contact.email,
      },
      invoices,
      payments: payments.map((p) => ({
        id: p.id,
        invoiceNumber: p.invoice.invoiceNumber,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        paidAt: p.paidAt,
        gateway: p.gateway,
      })),
    })
  } catch (error) {
    console.error("Error fetching portal data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
