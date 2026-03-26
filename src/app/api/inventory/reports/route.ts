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
    const type = searchParams.get("type") || "valuation"
    const dateFrom = searchParams.get("dateFrom") || ""
    const dateTo = searchParams.get("dateTo") || ""

    if (type === "valuation") {
      const items = await prisma.inventoryItem.findMany({
        where: {
          organizationId: orgId,
          isActive: true,
          isTracked: true,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          category: true,
          quantityOnHand: true,
          costPrice: true,
          sellingPrice: true,
          unitOfMeasure: true,
        },
        orderBy: { name: "asc" },
      })

      const valuationItems = items.map((item: any) => ({
        ...item,
        totalCostValue: (item.quantityOnHand || 0) * (item.costPrice || 0),
        totalSellingValue: (item.quantityOnHand || 0) * (item.sellingPrice || 0),
      }))

      const totalCostValue = valuationItems.reduce(
        (sum: number, i: any) => sum + i.totalCostValue,
        0
      )
      const totalSellingValue = valuationItems.reduce(
        (sum: number, i: any) => sum + i.totalSellingValue,
        0
      )

      // Group by category
      const byCategory: Record<string, { count: number; costValue: number; sellingValue: number }> = {}
      for (const item of valuationItems) {
        const cat = item.category || "Uncategorized"
        if (!byCategory[cat]) {
          byCategory[cat] = { count: 0, costValue: 0, sellingValue: 0 }
        }
        byCategory[cat].count += 1
        byCategory[cat].costValue += item.totalCostValue
        byCategory[cat].sellingValue += item.totalSellingValue
      }

      return NextResponse.json({
        type: "valuation",
        items: valuationItems,
        summary: {
          totalItems: items.length,
          totalCostValue,
          totalSellingValue,
          potentialProfit: totalSellingValue - totalCostValue,
        },
        byCategory,
      })
    }

    if (type === "movement-summary") {
      const dateFilter: any = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo + "T23:59:59.999Z")

      const where: any = { organizationId: orgId }
      if (dateFrom || dateTo) {
        where.date = dateFilter
      }

      const movements = await prisma.inventoryMovement.findMany({
        where,
        include: {
          inventoryItem: { select: { id: true, name: true, sku: true } },
        },
        orderBy: { date: "desc" },
      })

      // Summarize by type
      const byType: Record<string, { count: number; totalQuantity: number; totalCost: number }> = {}
      for (const m of movements) {
        const t = (m as any).type
        if (!byType[t]) {
          byType[t] = { count: 0, totalQuantity: 0, totalCost: 0 }
        }
        byType[t].count += 1
        byType[t].totalQuantity += Math.abs((m as any).quantity || 0)
        byType[t].totalCost += (m as any).totalCost || 0
      }

      // Summarize by item
      const byItem: Record<string, { name: string; sku: string; inQty: number; outQty: number; netQty: number }> = {}
      for (const m of movements) {
        const itemId = (m as any).inventoryItemId
        const item = (m as any).inventoryItem
        if (!byItem[itemId]) {
          byItem[itemId] = {
            name: item?.name || "Unknown",
            sku: item?.sku || "",
            inQty: 0,
            outQty: 0,
            netQty: 0,
          }
        }
        const qty = (m as any).quantity || 0
        if (["Purchase", "Return", "Adjustment"].includes((m as any).type) && qty > 0) {
          byItem[itemId].inQty += Math.abs(qty)
        } else {
          byItem[itemId].outQty += Math.abs(qty)
        }
        byItem[itemId].netQty += qty
      }

      return NextResponse.json({
        type: "movement-summary",
        totalMovements: movements.length,
        byType,
        byItem: Object.values(byItem),
        movements,
      })
    }

    if (type === "reorder") {
      const allItems = await prisma.inventoryItem.findMany({
        where: {
          organizationId: orgId,
          isActive: true,
          isTracked: true,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          category: true,
          quantityOnHand: true,
          reorderLevel: true,
          reorderQuantity: true,
          costPrice: true,
          supplierId: true,
          unitOfMeasure: true,
        },
        orderBy: { name: "asc" },
      })

      // Filter to items with reorder levels set and below that level
      const items = allItems.filter((item: any) => item.reorderLevel !== null)
      const belowReorder = items.filter(
        (item: any) => item.quantityOnHand <= item.reorderLevel
      )

      const reorderItems = belowReorder.map((item: any) => ({
        ...item,
        shortfall: item.reorderLevel - item.quantityOnHand,
        suggestedOrder: item.reorderQuantity || (item.reorderLevel - item.quantityOnHand) * 2,
        estimatedCost:
          (item.reorderQuantity || (item.reorderLevel - item.quantityOnHand) * 2) *
          (item.costPrice || 0),
      }))

      const totalEstimatedCost = reorderItems.reduce(
        (sum: number, i: any) => sum + i.estimatedCost,
        0
      )

      return NextResponse.json({
        type: "reorder",
        items: reorderItems,
        summary: {
          totalItemsToReorder: reorderItems.length,
          totalEstimatedCost,
        },
      })
    }

    return NextResponse.json(
      { error: "Invalid report type. Use: valuation, movement-summary, or reorder" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error generating inventory report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
