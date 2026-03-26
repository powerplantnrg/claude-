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
  const providerId = searchParams.get("providerId")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: any = {
    provider: { organizationId: orgId },
  }
  if (providerId) where.providerId = providerId
  if (from) where.date = { ...where.date, gte: new Date(from) }
  if (to) where.date = { ...where.date, lte: new Date(to) }

  const costs = await prisma.cloudCostEntry.findMany({
    where,
    include: { provider: true },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(costs)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { providerId, date, service, description, amount, currency, tags, experimentId } = body

  if (!providerId || !date || !service || amount === undefined) {
    return NextResponse.json(
      { error: "Provider, date, service, and amount are required" },
      { status: 400 }
    )
  }

  const cost = await prisma.cloudCostEntry.create({
    data: {
      providerId,
      date: new Date(date),
      service,
      description: description || null,
      amount: parseFloat(amount),
      currency: currency || "AUD",
      tags: tags || null,
      experimentId: experimentId || null,
    },
  })

  return NextResponse.json(cost, { status: 201 })
}
