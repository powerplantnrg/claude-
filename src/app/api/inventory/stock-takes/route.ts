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
    const status = searchParams.get("status") || ""

    const where: any = { organizationId: orgId }

    if (status) {
      where.status = status
    }

    const stockTakes = await prisma.stockTake.findMany({
      where,
      include: {
        items: {
          select: { id: true },
        },
      },
      orderBy: { date: "desc" },
    })

    // Add item count to each stock take
    const result = stockTakes.map((st: any) => ({
      ...st,
      itemCount: st.items.length,
      items: undefined,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching stock takes:", error)
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
    const { date, notes } = body

    // Get all tracked, active inventory items
    const trackedItems = await prisma.inventoryItem.findMany({
      where: {
        organizationId: orgId,
        isTracked: true,
        isActive: true,
      },
      select: {
        id: true,
        quantityOnHand: true,
        costPrice: true,
      },
    })

    if (trackedItems.length === 0) {
      return NextResponse.json(
        { error: "No tracked inventory items found" },
        { status: 400 }
      )
    }

    // Create stock take with all tracked items
    const stockTake = await prisma.stockTake.create({
      data: {
        date: date ? new Date(date) : new Date(),
        status: "Draft",
        notes: notes || null,
        organizationId: orgId,
        items: {
          create: trackedItems.map((item: any) => ({
            inventoryItemId: item.id,
            expectedQuantity: item.quantityOnHand || 0,
            countedQuantity: 0,
            variance: -(item.quantityOnHand || 0),
            varianceCost: -(item.quantityOnHand || 0) * (item.costPrice || 0),
            adjusted: false,
          })),
        },
      },
      include: {
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    })

    return NextResponse.json(stockTake, { status: 201 })
  } catch (error) {
    console.error("Error creating stock take:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
