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

    const reminders = await prisma.paymentReminder.findMany({
      where: { organizationId: orgId },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            dueDate: true,
            contact: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
    })

    return NextResponse.json(reminders)
  } catch (error) {
    console.error("Error fetching reminders:", error)
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
    const {
      invoiceId,
      scheduleType,
      daysOffset,
      emailTo,
      emailSubject,
      templateType,
    } = body

    if (!invoiceId || !scheduleType) {
      return NextResponse.json(
        { error: "Invoice and schedule type are required" },
        { status: 400 }
      )
    }

    // Fetch invoice to calculate scheduled date
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: { contact: { select: { email: true, name: true } } },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Calculate scheduled date based on type
    const offset = daysOffset || 0
    let scheduledDate: Date

    if (scheduleType === "before_due") {
      scheduledDate = new Date(invoice.dueDate)
      scheduledDate.setDate(scheduledDate.getDate() - Math.abs(offset))
    } else if (scheduleType === "after_due") {
      scheduledDate = new Date(invoice.dueDate)
      scheduledDate.setDate(scheduledDate.getDate() + Math.abs(offset))
    } else {
      scheduledDate = new Date()
    }

    const reminder = await prisma.paymentReminder.create({
      data: {
        invoiceId,
        scheduleType,
        daysOffset: offset,
        status: "Scheduled",
        scheduledDate,
        emailTo: emailTo || invoice.contact?.email || null,
        emailSubject: emailSubject || `Payment reminder: Invoice ${invoice.invoiceNumber}`,
        templateType: templateType || "standard",
        organizationId: orgId,
      },
    })

    return NextResponse.json(reminder, { status: 201 })
  } catch (error) {
    console.error("Error scheduling reminder:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
