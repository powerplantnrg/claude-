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
    const orgId = (session.user as any).organizationId as string
    const { id } = await params

    const item = await prisma.inventoryItem.findFirst({
      where: { id, organizationId: orgId },
      include: {
        account: { select: { id: true, name: true, code: true } },
        cogsAccount: { select: { id: true, name: true, code: true } },
        revenueAccount: { select: { id: true, name: true, code: true } },
      },
    })

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    // Fetch recent movements
    const movements = await prisma.inventoryMovement.findMany({
      where: { inventoryItemId: id, organizationId: orgId },
      orderBy: { date: "desc" },
      take: 50,
    })

    return NextResponse.json({ ...item, movements })
  } catch (error) {
    console.error("Error fetching inventory item:", error)
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
    const orgId = (session.user as any).organizationId as string
    const { id } = await params

    const item = await prisma.inventoryItem.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    const body = await request.json()
    const updateData: any = {}

    const allowedFields = [
      "name",
      "description",
      "category",
      "unitOfMeasure",
      "location",
      "barcode",
      "notes",
      "supplierId",
      "taxRateId",
      "accountId",
      "cogsAccountId",
      "revenueAccountId",
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null
      }
    }

    if (body.costPrice !== undefined) {
      updateData.costPrice = parseFloat(body.costPrice)
    }
    if (body.sellingPrice !== undefined) {
      updateData.sellingPrice = parseFloat(body.sellingPrice)
    }
    if (body.reorderLevel !== undefined) {
      updateData.reorderLevel = body.reorderLevel !== null ? parseInt(body.reorderLevel) : null
    }
    if (body.reorderQuantity !== undefined) {
      updateData.reorderQuantity = body.reorderQuantity !== null ? parseInt(body.reorderQuantity) : null
    }
    if (body.weight !== undefined) {
      updateData.weight = body.weight !== null ? parseFloat(body.weight) : null
    }
    if (body.isTracked !== undefined) {
      updateData.isTracked = body.isTracked
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
      include: {
        account: { select: { id: true, name: true, code: true } },
        cogsAccount: { select: { id: true, name: true, code: true } },
        revenueAccount: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating inventory item:", error)
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
    const orgId = (session.user as any).organizationId as string
    const { id } = await params

    const item = await prisma.inventoryItem.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    // Deactivate instead of hard delete
    await prisma.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: "Item deactivated" })
  } catch (error) {
    console.error("Error deactivating inventory item:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
