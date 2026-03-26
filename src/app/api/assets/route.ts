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
    const status = searchParams.get("status") || ""

    const where: any = { organizationId: orgId }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { assetNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
      ]
    }

    if (category) {
      where.category = category
    }

    if (status) {
      where.status = status
    }

    const assets = await prisma.fixedAsset.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        rdProject: { select: { id: true, name: true } },
      },
      orderBy: { purchaseDate: "desc" },
    })

    // Summary statistics
    const activeAssets = assets.filter((a: any) => a.status === "Active")
    const totalPurchasePrice = activeAssets.reduce(
      (sum: number, a: any) => sum + (a.purchasePrice || 0),
      0
    )
    const totalBookValue = activeAssets.reduce(
      (sum: number, a: any) => sum + (a.currentBookValue || 0),
      0
    )
    const accumulatedDepreciation = totalPurchasePrice - totalBookValue
    const rdAssets = activeAssets.filter((a: any) => a.isRdAsset)
    const rdAssetsValue = rdAssets.reduce(
      (sum: number, a: any) => sum + (a.currentBookValue || 0),
      0
    )

    return NextResponse.json({
      assets,
      summary: {
        totalAssets: activeAssets.length,
        totalPurchasePrice,
        totalBookValue,
        accumulatedDepreciation,
        rdAssetsCount: rdAssets.length,
        rdAssetsValue,
      },
    })
  } catch (error) {
    console.error("Error fetching assets:", error)
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
      purchaseDate,
      purchasePrice,
      residualValue,
      usefulLifeYears,
      depreciationMethod,
      accountId,
      depreciationAccountId,
      accumulatedDepreciationAccountId,
      location,
      serialNumber,
      supplier,
      warrantyExpiry,
      isRdAsset,
      rdProjectId,
      notes,
    } = body

    if (!name || !purchaseDate || !purchasePrice || !usefulLifeYears) {
      return NextResponse.json(
        { error: "Name, purchase date, purchase price, and useful life are required" },
        { status: 400 }
      )
    }

    // Auto-generate asset number
    const count = await prisma.fixedAsset.count({
      where: { organizationId: orgId },
    })
    const assetNumber = `FA-${String(count + 1).padStart(5, "0")}`

    const asset = await prisma.fixedAsset.create({
      data: {
        assetNumber,
        name,
        description: description || null,
        category: category || "Equipment",
        purchaseDate: new Date(purchaseDate),
        purchasePrice: parseFloat(purchasePrice),
        residualValue: parseFloat(residualValue || "0"),
        usefulLifeYears: parseInt(usefulLifeYears),
        depreciationMethod: depreciationMethod || "StraightLine",
        accountId: accountId || null,
        depreciationAccountId: depreciationAccountId || null,
        accumulatedDepreciationAccountId: accumulatedDepreciationAccountId || null,
        currentBookValue: parseFloat(purchasePrice),
        status: "Active",
        location: location || null,
        serialNumber: serialNumber || null,
        supplier: supplier || null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        isRdAsset: isRdAsset || false,
        rdProjectId: rdProjectId || null,
        notes: notes || null,
        organizationId: orgId,
      },
      include: {
        account: { select: { id: true, name: true } },
        rdProject: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error("Error creating asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
