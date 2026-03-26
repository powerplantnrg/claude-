import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId as string

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const category = searchParams.get("category") || ""
    const active = searchParams.get("active") || ""
    const tracked = searchParams.get("tracked") || ""
    const reorderAlerts = searchParams.get("reorderAlerts") === "true"

    const where: any = { organizationId: orgId }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ]
    }

    if (category) {
      where.category = category
    }

    if (active === "true") {
      where.isActive = true
    } else if (active === "false") {
      where.isActive = false
    }

    if (tracked === "true") {
      where.isTracked = true
    } else if (tracked === "false") {
      where.isTracked = false
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, code: true } },
        cogsAccount: { select: { id: true, name: true, code: true } },
        revenueAccount: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: "asc" },
    })

    let filteredItems = items
    if (reorderAlerts) {
      filteredItems = items.filter(
        (item: any) =>
          item.isTracked &&
          item.reorderLevel !== null &&
          item.quantityOnHand <= item.reorderLevel
      )
    }

    // Summary statistics
    const activeItems = items.filter((i: any) => i.isActive)
    const trackedItems = activeItems.filter((i: any) => i.isTracked)
    const totalStockValue = trackedItems.reduce(
      (sum: number, i: any) => sum + (i.quantityOnHand || 0) * (i.costPrice || 0),
      0
    )
    const reorderAlertItems = trackedItems.filter(
      (i: any) =>
        i.reorderLevel !== null && i.quantityOnHand <= i.reorderLevel
    )
    const lowStockItems = trackedItems.filter(
      (i: any) =>
        i.reorderLevel !== null &&
        i.quantityOnHand > 0 &&
        i.quantityOnHand <= i.reorderLevel * 1.5
    )

    return NextResponse.json({
      items: filteredItems,
      summary: {
        totalItems: activeItems.length,
        totalStockValue,
        reorderAlerts: reorderAlertItems.length,
        lowStock: lowStockItems.length,
      },
    })
  } catch (error) {
    console.error("Error fetching inventory:", error)
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
    const orgId = (session.user as any).organizationId as string

    const body = await request.json()
    const {
      name,
      description,
      category,
      unitOfMeasure,
      costPrice,
      sellingPrice,
      taxRateId,
      accountId,
      cogsAccountId,
      revenueAccountId,
      quantityOnHand,
      reorderLevel,
      reorderQuantity,
      isTracked,
      supplierId,
      location,
      barcode,
      weight,
      notes,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    // Auto-generate SKU
    const count = await prisma.inventoryItem.count({
      where: { organizationId: orgId },
    })
    const sku = `INV-${String(count + 1).padStart(5, "0")}`

    const item = await prisma.inventoryItem.create({
      data: {
        sku,
        name,
        description: description || null,
        category: category || "General",
        unitOfMeasure: unitOfMeasure || "Each",
        costPrice: costPrice !== undefined ? parseFloat(costPrice) : 0,
        sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : 0,
        taxRateId: taxRateId || null,
        accountId: accountId || null,
        cogsAccountId: cogsAccountId || null,
        revenueAccountId: revenueAccountId || null,
        quantityOnHand: quantityOnHand !== undefined ? parseInt(quantityOnHand) : 0,
        reorderLevel: reorderLevel !== undefined ? parseInt(reorderLevel) : undefined,
        reorderQuantity: reorderQuantity !== undefined ? parseInt(reorderQuantity) : undefined,
        isTracked: isTracked ?? true,
        isActive: true,
        supplierId: supplierId || null,
        location: location || null,
        barcode: barcode || null,
        weight: weight !== undefined ? parseFloat(weight) : null,
        notes: notes || null,
        organizationId: orgId,
      },
      include: {
        account: { select: { id: true, name: true, code: true } },
        cogsAccount: { select: { id: true, name: true, code: true } },
        revenueAccount: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("Error creating inventory item:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
