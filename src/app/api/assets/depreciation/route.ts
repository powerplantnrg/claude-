import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function calculateMonthlyDepreciation(
  purchasePrice: number,
  residualValue: number,
  usefulLifeYears: number,
  method: string,
  currentBookValue: number
): number {
  if (method === "DiminishingValue") {
    // Diminishing value: rate = 2 / useful life years, applied to current book value monthly
    const annualRate = 2 / usefulLifeYears
    const monthlyDepreciation = (currentBookValue * annualRate) / 12
    // Don't depreciate below residual value
    return Math.min(monthlyDepreciation, currentBookValue - residualValue)
  }

  // Straight line (default)
  const totalDepreciation = purchasePrice - residualValue
  const monthlyDepreciation = totalDepreciation / (usefulLifeYears * 12)
  // Don't depreciate below residual value
  return Math.min(monthlyDepreciation, currentBookValue - residualValue)
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId as string
    const userId = (session.user as any).id as string

    const body = await request.json()
    const { periodEnd } = body

    if (!periodEnd) {
      return NextResponse.json(
        { error: "Period end date is required" },
        { status: 400 }
      )
    }

    const periodEndDate = new Date(periodEnd)
    const periodStartDate = new Date(periodEndDate)
    periodStartDate.setDate(1) // First of the month

    // Get all active assets
    const assets = await prisma.fixedAsset.findMany({
      where: {
        organizationId: orgId,
        status: "Active",
        currentBookValue: { gt: 0 },
        purchaseDate: { lte: periodEndDate },
      },
    })

    if (assets.length === 0) {
      return NextResponse.json({
        message: "No active assets to depreciate",
        processed: 0,
      })
    }

    // Get next journal entry number
    const lastEntry = await prisma.journalEntry.findFirst({
      where: { organizationId: orgId },
      orderBy: { entryNumber: "desc" },
    })
    let entryNumber = (lastEntry?.entryNumber ?? 0) + 1

    const results: any[] = []

    for (const asset of assets) {
      // Check if depreciation already exists for this period
      const existing = await prisma.depreciationSchedule.findFirst({
        where: {
          fixedAssetId: asset.id,
          periodStart: periodStartDate,
          periodEnd: periodEndDate,
        },
      })

      if (existing) continue

      // Don't depreciate below residual value
      if (asset.currentBookValue <= asset.residualValue) continue

      const depreciationAmount = calculateMonthlyDepreciation(
        asset.purchasePrice,
        asset.residualValue,
        asset.usefulLifeYears,
        asset.depreciationMethod,
        asset.currentBookValue
      )

      if (depreciationAmount <= 0) continue

      const openingValue = asset.currentBookValue
      const closingValue = openingValue - depreciationAmount
      const accumulatedDepreciation = asset.purchasePrice - closingValue

      // Create journal entry for this asset's depreciation
      let journalEntryId: string | null = null

      if (asset.depreciationAccountId && asset.accumulatedDepreciationAccountId) {
        const journalEntry = await prisma.journalEntry.create({
          data: {
            entryNumber: entryNumber++,
            date: periodEndDate,
            reference: asset.assetNumber,
            narration: `Monthly depreciation for ${asset.name} (${asset.assetNumber})`,
            status: "Posted",
            sourceType: "Depreciation",
            sourceId: asset.id,
            organizationId: orgId,
            lines: {
              create: [
                {
                  accountId: asset.depreciationAccountId,
                  description: `Depreciation expense - ${asset.name}`,
                  debit: depreciationAmount,
                  credit: 0,
                  taxCode: null,
                },
                {
                  accountId: asset.accumulatedDepreciationAccountId,
                  description: `Accumulated depreciation - ${asset.name}`,
                  debit: 0,
                  credit: depreciationAmount,
                  taxCode: null,
                },
              ],
            },
          },
        })
        journalEntryId = journalEntry.id
      }

      // Create depreciation schedule entry
      const schedule = await prisma.depreciationSchedule.create({
        data: {
          fixedAssetId: asset.id,
          periodStart: periodStartDate,
          periodEnd: periodEndDate,
          openingValue,
          depreciationAmount,
          accumulatedDepreciation,
          closingValue,
          status: "Posted",
          journalEntryId,
        },
      })

      // Update asset's current book value
      await prisma.fixedAsset.update({
        where: { id: asset.id },
        data: { currentBookValue: closingValue },
      })

      results.push({
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        name: asset.name,
        depreciationAmount,
        closingValue,
        scheduleId: schedule.id,
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "Depreciation",
        entityId: "batch",
        details: `Ran monthly depreciation for ${results.length} assets. Period: ${periodStartDate.toISOString().split("T")[0]} to ${periodEndDate.toISOString().split("T")[0]}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json({
      message: `Depreciation processed for ${results.length} assets`,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error("Error running depreciation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
