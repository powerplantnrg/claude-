import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const recurring = await prisma.recurringInvoice.findMany({
      where: { organizationId: orgId },
      include: { contact: { select: { name: true } } },
      orderBy: { nextDate: "asc" },
    })

    return NextResponse.json(recurring)
  } catch (error) {
    console.error("Error fetching recurring invoices:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const { contactId, frequency, nextDate, endDate, dayOfMonth, templateData } = body

    if (!contactId || !frequency || !nextDate || !templateData) {
      return NextResponse.json(
        { error: "Contact, frequency, start date, and template data are required" },
        { status: 400 }
      )
    }

    const validFrequencies = ["weekly", "fortnightly", "monthly", "quarterly", "annually"]
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `Frequency must be one of: ${validFrequencies.join(", ")}` },
        { status: 400 }
      )
    }

    // Verify contact belongs to org
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, organizationId: orgId },
    })

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    const recurring = await prisma.recurringInvoice.create({
      data: {
        organizationId: orgId,
        contactId,
        frequency,
        nextDate: new Date(nextDate),
        endDate: endDate ? new Date(endDate) : null,
        dayOfMonth: dayOfMonth ?? null,
        templateData: typeof templateData === "string" ? templateData : JSON.stringify(templateData),
      },
      include: { contact: { select: { name: true } } },
    })

    return NextResponse.json(recurring, { status: 201 })
  } catch (error) {
    console.error("Error creating recurring invoice:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const { id, isActive, frequency, nextDate, endDate, dayOfMonth, templateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Recurring invoice ID is required" },
        { status: 400 }
      )
    }

    const existing = await prisma.recurringInvoice.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring invoice not found" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (isActive !== undefined) updateData.isActive = isActive
    if (frequency !== undefined) updateData.frequency = frequency
    if (nextDate !== undefined) updateData.nextDate = new Date(nextDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (dayOfMonth !== undefined) updateData.dayOfMonth = dayOfMonth
    if (templateData !== undefined) {
      updateData.templateData = typeof templateData === "string" ? templateData : JSON.stringify(templateData)
    }

    const updated = await prisma.recurringInvoice.update({
      where: { id },
      data: updateData,
      include: { contact: { select: { name: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating recurring invoice:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
