import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const providerId = searchParams.get("providerId")

  const providerWhere = { organizationId: orgId }

  if (type === "token") {
    const tokenWhere: any = { provider: providerWhere }
    if (providerId) tokenWhere.providerId = providerId

    const tokenUsage = await prisma.tokenUsage.findMany({
      where: tokenWhere,
      include: { provider: true },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(tokenUsage)
  }

  if (type === "compute") {
    const computeWhere: any = { provider: providerWhere }
    if (providerId) computeWhere.providerId = providerId

    const computeUsage = await prisma.computeUsage.findMany({
      where: computeWhere,
      include: { provider: true },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(computeUsage)
  }

  // Return both
  const tokenWhere: any = { provider: providerWhere }
  const computeWhere: any = { provider: providerWhere }
  if (providerId) {
    tokenWhere.providerId = providerId
    computeWhere.providerId = providerId
  }

  const [tokenUsage, computeUsage] = await Promise.all([
    prisma.tokenUsage.findMany({
      where: tokenWhere,
      include: { provider: true },
      orderBy: { date: "desc" },
    }),
    prisma.computeUsage.findMany({
      where: computeWhere,
      include: { provider: true },
      orderBy: { date: "desc" },
    }),
  ])

  return NextResponse.json({ tokenUsage, computeUsage })
}
