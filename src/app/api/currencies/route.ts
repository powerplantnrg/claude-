import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const currencies = await prisma.currency.findMany({
      where: { organizationId: orgId },
      orderBy: [{ isBase: "desc" }, { code: "asc" }],
    })

    return NextResponse.json(currencies)
  } catch (error) {
    console.error("Error fetching currencies:", error)
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
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const { code, name, symbol, exchangeRate, isBase } = body

    if (!code || !name || !symbol) {
      return NextResponse.json(
        { error: "Code, name, and symbol are required" },
        { status: 400 }
      )
    }

    // Check for duplicate code within this org
    const existing = await prisma.currency.findUnique({
      where: { organizationId_code: { organizationId: orgId, code } },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Currency ${code} already exists for this organization` },
        { status: 409 }
      )
    }

    // If setting this as base, unset any existing base
    if (isBase) {
      await prisma.currency.updateMany({
        where: { organizationId: orgId, isBase: true },
        data: { isBase: false },
      })
    }

    const currency = await prisma.currency.create({
      data: {
        code,
        name,
        symbol,
        exchangeRate: exchangeRate ?? 1.0,
        isBase: isBase ?? false,
        organizationId: orgId,
      },
    })

    return NextResponse.json(currency, { status: 201 })
  } catch (error) {
    console.error("Error creating currency:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const { id, exchangeRate, isBase } = body

    if (!id) {
      return NextResponse.json(
        { error: "Currency ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.currency.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Currency not found" },
        { status: 404 }
      )
    }

    // If setting this as base, unset any existing base
    if (isBase) {
      await prisma.currency.updateMany({
        where: { organizationId: orgId, isBase: true },
        data: { isBase: false },
      })
    }

    const updateData: { exchangeRate?: number; isBase?: boolean } = {}
    if (exchangeRate !== undefined) updateData.exchangeRate = exchangeRate
    if (isBase !== undefined) updateData.isBase = isBase

    const currency = await prisma.currency.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(currency)
  } catch (error) {
    console.error("Error updating currency:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
