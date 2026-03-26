import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId: orgId }
  if (status) where.status = status

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      contact: { select: { name: true } },
      lines: true,
    },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(purchaseOrders)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  try {
    const body = await request.json()
    const { contactId, date, deliveryDate, notes, lines } = body

    if (!contactId || !date || !lines?.length) {
      return NextResponse.json(
        { error: "Contact, date, and at least one line are required" },
        { status: 400 }
      )
    }

    // Generate PO number
    const count = await prisma.purchaseOrder.count({
      where: { organizationId: orgId },
    })
    const poNumber = `PO-${String(count + 1).padStart(6, "0")}`

    const subtotal = lines.reduce(
      (sum: number, l: { amount: number }) => sum + l.amount,
      0
    )
    const taxTotal = lines.reduce(
      (sum: number, l: { taxAmount: number }) => sum + (l.taxAmount || 0),
      0
    )
    const total = subtotal + taxTotal

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        organizationId: orgId,
        poNumber,
        contactId,
        date: new Date(date),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        status: "Draft",
        subtotal,
        taxTotal,
        total,
        notes,
        lines: {
          create: lines.map(
            (line: {
              description: string
              quantity: number
              unitPrice: number
              accountId: string
              taxType: string
              amount: number
              taxAmount: number
            }) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              accountId: line.accountId,
              taxType: line.taxType || "GST",
              amount: line.amount,
              taxAmount: line.taxAmount || 0,
            })
          ),
        },
      },
      include: { lines: true, contact: true },
    })

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    )
  }
}
