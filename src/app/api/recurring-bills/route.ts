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

    const recurringBills = await prisma.recurringBill.findMany({
      where: { organizationId: orgId },
      include: {
        contact: { select: { id: true, name: true } },
        account: { select: { id: true, name: true, code: true } },
      },
      orderBy: { nextDate: "asc" },
    })

    return NextResponse.json(recurringBills)
  } catch (error) {
    console.error("Error fetching recurring bills:", error)
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
    const {
      contactId,
      frequency,
      nextDate,
      endDate,
      accountId,
      description,
      amount,
      taxRateId,
      taxAmount,
      notes,
    } = body

    if (!contactId || !frequency || !nextDate || !amount) {
      return NextResponse.json(
        { error: "Contact, frequency, next date, and amount are required" },
        { status: 400 }
      )
    }

    const parsedAmount = parseFloat(amount)
    const parsedTaxAmount = taxAmount ? parseFloat(taxAmount) : 0
    const totalAmount = parsedAmount + parsedTaxAmount

    const recurringBill = await prisma.recurringBill.create({
      data: {
        contactId,
        frequency,
        nextDate: new Date(nextDate),
        endDate: endDate ? new Date(endDate) : null,
        accountId: accountId || null,
        description: description || null,
        amount: parsedAmount,
        taxRateId: taxRateId || null,
        taxAmount: parsedTaxAmount,
        totalAmount,
        isActive: true,
        generatedCount: 0,
        notes: notes || null,
        organizationId: orgId,
      },
      include: {
        contact: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(recurringBill, { status: 201 })
  } catch (error) {
    console.error("Error creating recurring bill:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
