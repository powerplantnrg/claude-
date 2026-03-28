import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId as string

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get("itemId") || ""
    const type = searchParams.get("type") || ""
    const dateFrom = searchParams.get("dateFrom") || ""
    const dateTo = searchParams.get("dateTo") || ""

    const where: any = { organizationId: orgId }

    if (itemId) {
      where.inventoryItemId = itemId
    }

    if (type) {
      where.type = type
    }

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) {
        where.date.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo + "T23:59:59.999Z")
      }
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        inventoryItem: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { date: "desc" },
      take: 200,
    })

    return NextResponse.json(movements)
  } catch (error) {
    console.error("Error fetching inventory movements:", error)
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
    const orgId = (session.user as any).organizationId as string

    const body = await request.json()
    const {
      inventoryItemId,
      type,
      quantity,
      unitCost,
      reference,
      referenceType,
      referenceId,
      date,
      notes,
    } = body

    if (!inventoryItemId || !type || quantity === undefined) {
      return NextResponse.json(
        { error: "Item, type, and quantity are required" },
        { status: 400 }
      )
    }

    const validTypes = ["Purchase", "Sale", "Adjustment", "Transfer", "WriteOff", "Return"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid movement type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // Verify the item exists and belongs to the organization
    const item = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, organizationId: orgId },
    })

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      )
    }

    const qty = parseInt(quantity)
    const cost = unitCost !== undefined ? parseFloat(unitCost) : (item as any).costPrice || 0
    const totalCost = Math.abs(qty) * cost

    // Calculate quantity change based on type
    let quantityChange = qty
    if (type === "Sale" || type === "WriteOff") {
      quantityChange = -Math.abs(qty)
    } else if (type === "Return") {
      quantityChange = Math.abs(qty)
    }

    // Create movement and update item quantity in a transaction
    const [movement] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          inventoryItemId,
          type,
          quantity: qty,
          unitCost: cost,
          totalCost,
          reference: reference || null,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          date: date ? new Date(date) : new Date(),
          notes: notes || null,
          organizationId: orgId,
        },
        include: {
          inventoryItem: { select: { id: true, name: true, sku: true } },
        },
      }),
      prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          quantityOnHand: { increment: quantityChange },
        },
      }),
    ])

    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    console.error("Error creating inventory movement:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
