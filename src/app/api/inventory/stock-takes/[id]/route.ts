import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId as string
    const { id } = await params

    const stockTake = await prisma.stockTake.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, sku: true, costPrice: true, unitOfMeasure: true },
            },
          },
          orderBy: { inventoryItem: { name: "asc" } },
        },
      },
    })

    if (!stockTake) {
      return NextResponse.json({ error: "Stock take not found" }, { status: 404 })
    }

    return NextResponse.json(stockTake)
  } catch (error) {
    console.error("Error fetching stock take:", error)
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId as string
    const userId = (session.user as any).id as string
    const { id } = await params

    const stockTake = await prisma.stockTake.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    })

    if (!stockTake) {
      return NextResponse.json({ error: "Stock take not found" }, { status: 404 })
    }

    const body = await request.json()

    // Update counts for individual items
    if (body.items && Array.isArray(body.items)) {
      for (const itemUpdate of body.items) {
        const counted = parseInt(itemUpdate.countedQuantity)
        const stockTakeItem = (stockTake as any).items.find(
          (i: any) => i.id === itemUpdate.id
        )

        if (stockTakeItem) {
          const variance = counted - stockTakeItem.expectedQuantity
          const varianceCost = variance * ((stockTakeItem.inventoryItem as any)?.costPrice || 0)

          await prisma.stockTakeItem.update({
            where: { id: itemUpdate.id },
            data: {
              countedQuantity: counted,
              variance,
              varianceCost,
            },
          })
        }
      }

      // Update status to InProgress if still Draft
      if ((stockTake as any).status === "Draft") {
        await prisma.stockTake.update({
          where: { id },
          data: { status: "InProgress" },
        })
      }
    }

    // Complete the stock take
    if (body.action === "complete") {
      if ((stockTake as any).status === "Completed") {
        return NextResponse.json(
          { error: "Stock take is already completed" },
          { status: 400 }
        )
      }

      if ((stockTake as any).status === "Cancelled") {
        return NextResponse.json(
          { error: "Cannot complete a cancelled stock take" },
          { status: 400 }
        )
      }

      // Apply adjustments for items with variance
      const operations: any[] = []

      for (const item of (stockTake as any).items) {
        if (item.variance !== 0 && !item.adjusted) {
          // Create adjustment movement
          operations.push(
            prisma.inventoryMovement.create({
              data: {
                inventoryItemId: item.inventoryItemId,
                type: "Adjustment",
                quantity: item.variance,
                unitCost: (item.inventoryItem as any)?.costPrice || 0,
                totalCost: Math.abs(item.variance) * ((item.inventoryItem as any)?.costPrice || 0),
                reference: `Stock Take ${id}`,
                referenceType: "StockTake",
                referenceId: id,
                date: new Date(),
                notes: `Stock take adjustment. Expected: ${item.expectedQuantity}, Counted: ${item.countedQuantity}`,
                organizationId: orgId,
              },
            })
          )

          // Update inventory quantity
          operations.push(
            prisma.inventoryItem.update({
              where: { id: item.inventoryItemId },
              data: {
                quantityOnHand: item.countedQuantity,
              },
            })
          )

          // Mark as adjusted
          operations.push(
            prisma.stockTakeItem.update({
              where: { id: item.id },
              data: { adjusted: true },
            })
          )
        }
      }

      // Complete the stock take
      operations.push(
        prisma.stockTake.update({
          where: { id },
          data: {
            status: "Completed",
            completedById: userId,
            completedAt: new Date(),
          },
        })
      )

      await prisma.$transaction(operations)
    }

    // Cancel the stock take
    if (body.action === "cancel") {
      if ((stockTake as any).status === "Completed") {
        return NextResponse.json(
          { error: "Cannot cancel a completed stock take" },
          { status: 400 }
        )
      }

      await prisma.stockTake.update({
        where: { id },
        data: { status: "Cancelled" },
      })
    }

    // Fetch updated stock take
    const updated = await prisma.stockTake.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, sku: true, costPrice: true, unitOfMeasure: true },
            },
          },
          orderBy: { inventoryItem: { name: "asc" } },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating stock take:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
