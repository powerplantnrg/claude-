import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId: orgId }

  if (category) {
    where.category = category
  }

  if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(from)
    if (to) where.date.lte = new Date(to)
  }

  const entries = await prisma.carbonEntry.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      project: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ entries })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const body = await request.json()
  const { date, category, source, quantity, unit, emissionFactor, cost, notes, projectId } = body

  // Validation
  if (!date || !category || !source || quantity == null || !unit || emissionFactor == null) {
    return NextResponse.json(
      { error: "Missing required fields: date, category, source, quantity, unit, emissionFactor" },
      { status: 400 }
    )
  }

  if (!["Scope1", "Scope2", "Scope3"].includes(category)) {
    return NextResponse.json(
      { error: "Category must be Scope1, Scope2, or Scope3" },
      { status: 400 }
    )
  }

  if (typeof quantity !== "number" || quantity < 0) {
    return NextResponse.json({ error: "Quantity must be a non-negative number" }, { status: 400 })
  }

  if (typeof emissionFactor !== "number" || emissionFactor < 0) {
    return NextResponse.json(
      { error: "Emission factor must be a non-negative number" },
      { status: 400 }
    )
  }

  const totalEmissions = quantity * emissionFactor

  const entry = await prisma.carbonEntry.create({
    data: {
      organizationId: orgId,
      date: new Date(date),
      category,
      source,
      quantity,
      unit,
      emissionFactor,
      totalEmissions,
      cost: cost != null ? Number(cost) : null,
      notes: notes || null,
      projectId: projectId || null,
    },
    include: {
      project: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ entry }, { status: 201 })
}
