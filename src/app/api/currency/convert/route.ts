import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const { amount, fromCurrency, toCurrency, date } = body

    if (!amount || !fromCurrency || !toCurrency) {
      return NextResponse.json(
        { error: "Amount, from currency, and to currency are required" },
        { status: 400 }
      )
    }

    if (fromCurrency === toCurrency) {
      return NextResponse.json({
        originalAmount: parseFloat(amount),
        convertedAmount: parseFloat(amount),
        fromCurrency,
        toCurrency,
        rate: 1,
        effectiveDate: date || new Date().toISOString(),
      })
    }

    // Find the most recent exchange rate for this pair on or before the given date
    const effectiveDate = date ? new Date(date) : new Date()

    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: {
        organizationId: orgId,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        effectiveDate: { lte: effectiveDate },
      },
      orderBy: { effectiveDate: "desc" },
    })

    if (!exchangeRate) {
      // Try the inverse pair
      const inverseRate = await prisma.exchangeRate.findFirst({
        where: {
          organizationId: orgId,
          fromCurrency: toCurrency.toUpperCase(),
          toCurrency: fromCurrency.toUpperCase(),
          effectiveDate: { lte: effectiveDate },
        },
        orderBy: { effectiveDate: "desc" },
      })

      if (!inverseRate) {
        return NextResponse.json(
          { error: `No exchange rate found for ${fromCurrency}/${toCurrency}` },
          { status: 404 }
        )
      }

      const rate = 1 / inverseRate.rate
      const convertedAmount = parseFloat(amount) * rate

      return NextResponse.json({
        originalAmount: parseFloat(amount),
        convertedAmount: Math.round(convertedAmount * 100) / 100,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        rate: Math.round(rate * 1000000) / 1000000,
        effectiveDate: inverseRate.effectiveDate,
        source: inverseRate.source,
        inverse: true,
      })
    }

    const convertedAmount = parseFloat(amount) * exchangeRate.rate

    return NextResponse.json({
      originalAmount: parseFloat(amount),
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      rate: exchangeRate.rate,
      effectiveDate: exchangeRate.effectiveDate,
      source: exchangeRate.source,
      inverse: false,
    })
  } catch (error) {
    console.error("Error converting currency:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
