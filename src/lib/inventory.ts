import { prisma } from "./prisma"

/**
 * Adjust stock for an inventory item by creating a movement record and updating quantity on hand.
 */
export async function adjustStock(
  itemId: string,
  quantity: number,
  type: "Purchase" | "Sale" | "Adjustment" | "Transfer" | "WriteOff" | "Return",
  reference?: { ref?: string; referenceType?: string; referenceId?: string; unitCost?: number; notes?: string }
) {
  const item = await prisma.inventoryItem.findUniqueOrThrow({
    where: { id: itemId },
  })

  const unitCost = reference?.unitCost ?? item.costPrice
  const totalCost = Math.abs(quantity) * unitCost

  const movement = await prisma.inventoryMovement.create({
    data: {
      organizationId: item.organizationId,
      inventoryItemId: itemId,
      type,
      quantity,
      unitCost,
      totalCost: quantity >= 0 ? totalCost : -totalCost,
      reference: reference?.ref,
      referenceType: reference?.referenceType,
      referenceId: reference?.referenceId,
      date: new Date(),
      notes: reference?.notes,
    },
  })

  const updatedItem = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      quantityOnHand: { increment: quantity },
    },
  })

  return { movement, updatedItem }
}

/**
 * Calculate COGS using weighted average cost method from a set of movements.
 */
export function calculateCOGS(
  movements: Array<{ type: string; quantity: number; unitCost: number; totalCost: number }>
): { weightedAverageCost: number; totalCOGS: number; totalUnitsSold: number } {
  let totalQuantity = 0
  let totalValue = 0
  let totalCOGS = 0
  let totalUnitsSold = 0

  for (const m of movements) {
    if (m.quantity > 0) {
      // Inbound: Purchase, Return
      totalValue += m.quantity * m.unitCost
      totalQuantity += m.quantity
    } else if (m.quantity < 0) {
      // Outbound: Sale, WriteOff, Transfer out
      const avgCost = totalQuantity > 0 ? totalValue / totalQuantity : m.unitCost
      const unitsOut = Math.abs(m.quantity)
      totalCOGS += unitsOut * avgCost
      totalUnitsSold += unitsOut
      totalQuantity -= unitsOut
      totalValue -= unitsOut * avgCost
    }
  }

  const weightedAverageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0

  return { weightedAverageCost, totalCOGS, totalUnitsSold }
}

/**
 * Get total inventory valuation for an organization using weighted average cost.
 */
export async function getStockValuation(orgId: string) {
  const items = await prisma.inventoryItem.findMany({
    where: { organizationId: orgId, isActive: true, isTracked: true },
    include: {
      movements: { orderBy: { date: "asc" } },
    },
  })

  const valuations = items.map((item) => {
    const { weightedAverageCost } = calculateCOGS(item.movements)
    const value = item.quantityOnHand * (weightedAverageCost || item.costPrice)
    return {
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      quantityOnHand: item.quantityOnHand,
      weightedAverageCost: weightedAverageCost || item.costPrice,
      totalValue: value,
    }
  })

  const totalValuation = valuations.reduce((sum, v) => sum + v.totalValue, 0)

  return { items: valuations, totalValuation }
}

/**
 * Check for items below their reorder level.
 */
export async function checkReorderAlerts(orgId: string) {
  const items = await prisma.inventoryItem.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      isTracked: true,
    },
  })

  return items
    .filter((item) => item.quantityOnHand <= item.reorderLevel)
    .map((item) => ({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      quantityOnHand: item.quantityOnHand,
      reorderLevel: item.reorderLevel,
      reorderQuantity: item.reorderQuantity,
      deficit: item.reorderLevel - item.quantityOnHand,
    }))
}

/**
 * Process a stock take: calculate variances and optionally create adjustment movements.
 */
export async function processStockTake(stockTakeId: string) {
  const stockTake = await prisma.stockTake.findUniqueOrThrow({
    where: { id: stockTakeId },
    include: {
      items: { include: { inventoryItem: true } },
    },
  })

  const results = []

  for (const item of stockTake.items) {
    const variance = item.countedQuantity - item.expectedQuantity
    const varianceCost = variance * item.inventoryItem.costPrice

    // Update the stock take item with variance info
    await prisma.stockTakeItem.update({
      where: { id: item.id },
      data: { variance, varianceCost },
    })

    // If there is a variance, create an adjustment movement
    if (variance !== 0) {
      await prisma.inventoryMovement.create({
        data: {
          organizationId: stockTake.organizationId,
          inventoryItemId: item.inventoryItemId,
          type: "Adjustment",
          quantity: variance,
          unitCost: item.inventoryItem.costPrice,
          totalCost: varianceCost,
          reference: `StockTake-${stockTakeId}`,
          referenceType: "Manual",
          referenceId: stockTakeId,
          date: new Date(),
          notes: `Stock take adjustment: expected ${item.expectedQuantity}, counted ${item.countedQuantity}`,
        },
      })

      // Update quantity on hand
      await prisma.inventoryItem.update({
        where: { id: item.inventoryItemId },
        data: { quantityOnHand: item.countedQuantity },
      })

      await prisma.stockTakeItem.update({
        where: { id: item.id },
        data: { adjusted: true },
      })
    }

    results.push({
      itemId: item.inventoryItemId,
      sku: item.inventoryItem.sku,
      name: item.inventoryItem.name,
      expected: item.expectedQuantity,
      counted: item.countedQuantity,
      variance,
      varianceCost,
      adjusted: variance !== 0,
    })
  }

  // Mark stock take as completed
  await prisma.stockTake.update({
    where: { id: stockTakeId },
    data: { status: "Completed", completedAt: new Date() },
  })

  return {
    stockTakeId,
    totalItems: results.length,
    itemsWithVariance: results.filter((r) => r.variance !== 0).length,
    totalVarianceCost: results.reduce((sum, r) => sum + r.varianceCost, 0),
    results,
  }
}
