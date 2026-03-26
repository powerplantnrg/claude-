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
    const reportType = searchParams.get("type")

    switch (reportType) {
      case "register":
        return handleRegister(orgId)
      case "depreciation-forecast":
        return handleDepreciationForecast(orgId)
      case "rd-assets":
        return handleRdAssets(orgId)
      default:
        return NextResponse.json(
          {
            error:
              "Invalid report type. Use: register, depreciation-forecast, rd-assets",
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error generating asset report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function handleRegister(orgId: string) {
  const assets = await prisma.fixedAsset.findMany({
    where: { organizationId: orgId },
    include: {
      account: { select: { id: true, name: true, code: true } },
      depreciationAccount: { select: { id: true, name: true, code: true } },
      rdProject: { select: { id: true, name: true } },
    },
    orderBy: { assetNumber: "asc" },
  })

  const summary = {
    totalAssets: assets.length,
    activeAssets: assets.filter((a) => a.status === "Active").length,
    disposedAssets: assets.filter((a) => a.status === "Disposed").length,
    totalCost: assets
      .filter((a) => a.status === "Active")
      .reduce((sum, a) => sum + a.purchasePrice, 0),
    totalBookValue: assets
      .filter((a) => a.status === "Active")
      .reduce((sum, a) => sum + a.currentBookValue, 0),
    totalAccumulatedDepreciation: assets
      .filter((a) => a.status === "Active")
      .reduce((sum, a) => sum + (a.purchasePrice - a.currentBookValue), 0),
  }

  return NextResponse.json({ assets, summary })
}

async function handleDepreciationForecast(orgId: string) {
  const assets = await prisma.fixedAsset.findMany({
    where: {
      organizationId: orgId,
      status: "Active",
      currentBookValue: { gt: 0 },
    },
  })

  // Generate 12-month forecast
  const forecast: {
    month: string
    totalDepreciation: number
    totalBookValue: number
    assetBreakdown: {
      assetId: string
      assetNumber: string
      name: string
      depreciation: number
      bookValue: number
    }[]
  }[] = []

  // Clone asset data so we can simulate forward
  const simAssets = assets.map((a) => ({
    id: a.id,
    assetNumber: a.assetNumber,
    name: a.name,
    purchasePrice: a.purchasePrice,
    residualValue: a.residualValue,
    usefulLifeYears: a.usefulLifeYears,
    depreciationMethod: a.depreciationMethod,
    currentBookValue: a.currentBookValue,
  }))

  const now = new Date()

  for (let i = 0; i < 12; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 0)
    const monthLabel = forecastDate.toLocaleDateString("en-AU", {
      month: "short",
      year: "numeric",
    })

    let totalDepreciation = 0
    const assetBreakdown: any[] = []

    for (const asset of simAssets) {
      if (asset.currentBookValue <= asset.residualValue) {
        assetBreakdown.push({
          assetId: asset.id,
          assetNumber: asset.assetNumber,
          name: asset.name,
          depreciation: 0,
          bookValue: asset.currentBookValue,
        })
        continue
      }

      let monthlyDep: number
      if (asset.depreciationMethod === "DiminishingValue") {
        const annualRate = 2 / asset.usefulLifeYears
        monthlyDep = (asset.currentBookValue * annualRate) / 12
      } else {
        const totalDep = asset.purchasePrice - asset.residualValue
        monthlyDep = totalDep / (asset.usefulLifeYears * 12)
      }

      monthlyDep = Math.min(
        monthlyDep,
        asset.currentBookValue - asset.residualValue
      )
      monthlyDep = Math.max(0, monthlyDep)

      asset.currentBookValue -= monthlyDep
      totalDepreciation += monthlyDep

      assetBreakdown.push({
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        name: asset.name,
        depreciation: Math.round(monthlyDep * 100) / 100,
        bookValue: Math.round(asset.currentBookValue * 100) / 100,
      })
    }

    forecast.push({
      month: monthLabel,
      totalDepreciation: Math.round(totalDepreciation * 100) / 100,
      totalBookValue: Math.round(
        simAssets.reduce((sum, a) => sum + a.currentBookValue, 0) * 100
      ) / 100,
      assetBreakdown,
    })
  }

  return NextResponse.json({ forecast })
}

async function handleRdAssets(orgId: string) {
  const assets = await prisma.fixedAsset.findMany({
    where: {
      organizationId: orgId,
      isRdAsset: true,
    },
    include: {
      rdProject: { select: { id: true, name: true } },
      depreciationSchedules: {
        orderBy: { periodStart: "desc" },
        take: 12,
      },
    },
    orderBy: { assetNumber: "asc" },
  })

  const summary = {
    totalRdAssets: assets.length,
    activeRdAssets: assets.filter((a) => a.status === "Active").length,
    totalRdAssetCost: assets
      .filter((a) => a.status === "Active")
      .reduce((sum, a) => sum + a.purchasePrice, 0),
    totalRdBookValue: assets
      .filter((a) => a.status === "Active")
      .reduce((sum, a) => sum + a.currentBookValue, 0),
    totalRdDepreciation: assets
      .filter((a) => a.status === "Active")
      .reduce(
        (sum, a) =>
          sum +
          a.depreciationSchedules.reduce(
            (dSum, d) => dSum + d.depreciationAmount,
            0
          ),
        0
      ),
    byProject: [] as { projectId: string; projectName: string; assetCount: number; totalCost: number; totalBookValue: number }[],
  }

  // Group by R&D project
  const projectMap = new Map<
    string,
    { projectName: string; assets: typeof assets }
  >()

  for (const asset of assets) {
    const projectId = asset.rdProjectId || "unassigned"
    const projectName = asset.rdProject?.name || "Unassigned"
    if (!projectMap.has(projectId)) {
      projectMap.set(projectId, { projectName, assets: [] })
    }
    projectMap.get(projectId)!.assets.push(asset)
  }

  for (const [projectId, data] of projectMap) {
    const active = data.assets.filter((a) => a.status === "Active")
    summary.byProject.push({
      projectId,
      projectName: data.projectName,
      assetCount: active.length,
      totalCost: active.reduce((sum, a) => sum + a.purchasePrice, 0),
      totalBookValue: active.reduce((sum, a) => sum + a.currentBookValue, 0),
    })
  }

  return NextResponse.json({ assets, summary })
}
