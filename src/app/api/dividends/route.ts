import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const dividends = await prisma.dividend.findMany({
      where: { organizationId: orgId },
      orderBy: { declarationDate: "desc" },
    })

    // Calculate franking credit summary
    const totalDividends = dividends
      .filter((d) => d.status !== "Cancelled")
      .reduce((sum, d) => sum + (d.totalAmount ?? 0), 0)
    const totalFrankingCredits = dividends
      .filter((d) => d.status !== "Cancelled")
      .reduce((sum, d) => sum + (d.frankingCredits ?? 0), 0)

    return NextResponse.json({
      dividends,
      summary: {
        totalDividends,
        totalFrankingCredits,
        declaredCount: dividends.filter((d) => d.status === "Declared").length,
        paidCount: dividends.filter((d) => d.status === "Paid").length,
      },
    })
  } catch (error) {
    console.error("Error fetching dividends:", error)
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
    const {
      declarationDate,
      recordDate,
      paymentDate,
      amountPerShare,
      totalAmount,
      frankingPercentage,
      notes,
    } = body

    if (!declarationDate || !totalAmount) {
      return NextResponse.json(
        { error: "Declaration date and total amount are required" },
        { status: 400 }
      )
    }

    // Calculate franking credits
    // Australian corporate tax rate of 25% for base rate entities
    const taxRate = 0.25
    const frankingPct = frankingPercentage !== undefined ? parseFloat(frankingPercentage) / 100 : 1
    const frankingCredits = (parseFloat(totalAmount) * frankingPct * taxRate) / (1 - taxRate)

    const dividend = await prisma.dividend.create({
      data: {
        declarationDate: new Date(declarationDate),
        recordDate: recordDate ? new Date(recordDate) : new Date(declarationDate),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(declarationDate),
        amountPerShare: amountPerShare ? parseFloat(amountPerShare) : 0,
        totalAmount: parseFloat(totalAmount),
        frankingPercentage: frankingPercentage ? parseFloat(frankingPercentage) : 100,
        frankingCredits: Math.round(frankingCredits * 100) / 100,
        status: "Declared",
        notes: notes || null,
        organizationId: orgId,
      },
    })

    return NextResponse.json(dividend, { status: 201 })
  } catch (error) {
    console.error("Error declaring dividend:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
