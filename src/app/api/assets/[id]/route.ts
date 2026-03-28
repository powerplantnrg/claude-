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

    const asset = await prisma.fixedAsset.findFirst({
      where: { id, organizationId: orgId },
      include: {
        account: { select: { id: true, name: true, code: true } },
        depreciationAccount: { select: { id: true, name: true, code: true } },
        accumulatedDepreciationAccount: { select: { id: true, name: true, code: true } },
        rdProject: { select: { id: true, name: true } },
        depreciationSchedules: {
          orderBy: { periodStart: "asc" },
          include: {
            journalEntry: { select: { id: true, entryNumber: true } },
          },
        },
      },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error("Error fetching asset:", error)
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
    const { id } = await params

    const asset = await prisma.fixedAsset.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const body = await request.json()

    // Handle disposal
    if (body.action === "dispose") {
      if (asset.status !== "Active") {
        return NextResponse.json(
          { error: "Only active assets can be disposed" },
          { status: 400 }
        )
      }

      const { disposalDate, disposalPrice, disposalMethod } = body

      if (!disposalDate || disposalPrice === undefined || !disposalMethod) {
        return NextResponse.json(
          { error: "Disposal date, price, and method are required" },
          { status: 400 }
        )
      }

      const gainLoss = parseFloat(disposalPrice) - asset.currentBookValue

      // Create journal entry for disposal
      const lastEntry = await prisma.journalEntry.findFirst({
        where: { organizationId: orgId },
        orderBy: { entryNumber: "desc" },
      })
      const entryNumber = (lastEntry?.entryNumber ?? 0) + 1

      const journalLines: {
        accountId: string
        description: string
        debit: number
        credit: number
        taxCode: string | null
      }[] = []

      // Debit accumulated depreciation (remove it)
      if (asset.accumulatedDepreciationAccountId) {
        const accumDepreciation = asset.purchasePrice - asset.currentBookValue
        journalLines.push({
          accountId: asset.accumulatedDepreciationAccountId,
          description: `Disposal of ${asset.name} - Remove accumulated depreciation`,
          debit: accumDepreciation,
          credit: 0,
          taxCode: null,
        })
      }

      // Credit the asset account (remove the asset)
      if (asset.accountId) {
        journalLines.push({
          accountId: asset.accountId,
          description: `Disposal of ${asset.name} - Remove asset`,
          debit: 0,
          credit: asset.purchasePrice,
          taxCode: null,
        })
      }

      // Record gain or loss if there are journal lines
      if (journalLines.length > 0) {
        await prisma.journalEntry.create({
          data: {
            entryNumber,
            date: new Date(disposalDate),
            reference: asset.assetNumber,
            narration: `Disposal of fixed asset ${asset.assetNumber} - ${asset.name}. ${
              gainLoss >= 0 ? "Gain" : "Loss"
            } on disposal: $${Math.abs(gainLoss).toFixed(2)}`,
            status: "Posted",
            sourceType: "AssetDisposal",
            sourceId: asset.id,
            organizationId: orgId,
            lines: { create: journalLines },
          },
        })
      }

      const updated = await prisma.fixedAsset.update({
        where: { id },
        data: {
          status: "Disposed",
          disposalDate: new Date(disposalDate),
          disposalPrice: parseFloat(disposalPrice),
          disposalMethod,
        },
        include: {
          account: { select: { id: true, name: true } },
          rdProject: { select: { id: true, name: true } },
        },
      })

      return NextResponse.json(updated)
    }

    // Regular update
    const updateData: any = {}
    const allowedFields = [
      "name",
      "description",
      "category",
      "location",
      "serialNumber",
      "supplier",
      "notes",
      "isRdAsset",
      "rdProjectId",
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.warrantyExpiry !== undefined) {
      updateData.warrantyExpiry = body.warrantyExpiry
        ? new Date(body.warrantyExpiry)
        : null
    }

    const updated = await prisma.fixedAsset.update({
      where: { id },
      data: updateData,
      include: {
        account: { select: { id: true, name: true } },
        rdProject: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating asset:", error)
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId as string
    const { id } = await params

    const asset = await prisma.fixedAsset.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Delete depreciation schedules first
    await prisma.depreciationSchedule.deleteMany({
      where: { fixedAssetId: id },
    })

    await prisma.fixedAsset.delete({ where: { id } })

    return NextResponse.json({ message: "Asset deleted" })
  } catch (error) {
    console.error("Error deleting asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
