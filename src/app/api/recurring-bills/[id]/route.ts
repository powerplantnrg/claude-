import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const bill = await prisma.recurringBill.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!bill) {
      return NextResponse.json({ error: "Recurring bill not found" }, { status: 404 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.frequency !== undefined) updateData.frequency = body.frequency
    if (body.nextDate !== undefined) updateData.nextDate = new Date(body.nextDate)
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.accountId !== undefined) updateData.accountId = body.accountId || null
    if (body.description !== undefined) updateData.description = body.description
    if (body.amount !== undefined) {
      updateData.amount = parseFloat(body.amount)
      const tax = body.taxAmount ? parseFloat(body.taxAmount) : (bill.taxAmount ?? 0)
      updateData.totalAmount = parseFloat(body.amount) + tax
    }
    if (body.taxAmount !== undefined) {
      updateData.taxAmount = parseFloat(body.taxAmount)
      const amt = body.amount ? parseFloat(body.amount) : (bill.amount ?? 0)
      updateData.totalAmount = amt + parseFloat(body.taxAmount)
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.contactId !== undefined) updateData.contactId = body.contactId

    const updated = await prisma.recurringBill.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating recurring bill:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const bill = await prisma.recurringBill.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!bill) {
      return NextResponse.json({ error: "Recurring bill not found" }, { status: 404 })
    }

    await prisma.recurringBill.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting recurring bill:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
