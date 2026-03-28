import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const { searchParams } = new URL(request.url)
    const fromCurrency = searchParams.get("from")
    const toCurrency = searchParams.get("to")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: any = { organizationId: orgId }
    if (fromCurrency) where.fromCurrency = fromCurrency
    if (toCurrency) where.toCurrency = toCurrency
    if (startDate || endDate) {
      where.effectiveDate = {}
      if (startDate) where.effectiveDate.gte = new Date(startDate)
      if (endDate) where.effectiveDate.lte = new Date(endDate)
    }

    const rates = await prisma.exchangeRate.findMany({
      where,
      orderBy: { effectiveDate: "desc" },
    })

    return NextResponse.json(rates)
  } catch (error) {
    console.error("Error fetching exchange rates:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const { fromCurrency, toCurrency, rate, effectiveDate, source } = body

    if (!fromCurrency || !toCurrency || !rate || !effectiveDate) {
      return NextResponse.json(
        { error: "From currency, to currency, rate, and effective date are required" },
        { status: 400 }
      )
    }

    if (fromCurrency === toCurrency) {
      return NextResponse.json(
        { error: "From and to currencies must be different" },
        { status: 400 }
      )
    }

    if (parseFloat(rate) <= 0) {
      return NextResponse.json(
        { error: "Exchange rate must be positive" },
        { status: 400 }
      )
    }

    const exchangeRate = await prisma.exchangeRate.create({
      data: {
        organizationId: orgId,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        rate: parseFloat(rate),
        effectiveDate: new Date(effectiveDate),
        source: source || "Manual",
      },
    })

    return NextResponse.json(exchangeRate, { status: 201 })
  } catch (error) {
    console.error("Error creating exchange rate:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
