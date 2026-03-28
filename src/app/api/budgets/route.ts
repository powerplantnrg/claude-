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

    const budgets = await prisma.budget.findMany({
      where: { organizationId: orgId },
      include: {
        items: {
          select: { total: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const result = budgets.map((b) => ({
      ...b,
      totalBudget: b.items.reduce((sum, item) => sum + item.total, 0),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching budgets:", error)
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
    const { name, financialYear, items } = body

    if (!name || !financialYear) {
      return NextResponse.json(
        { error: "Name and financial year are required" },
        { status: 400 }
      )
    }

    const budget = await prisma.budget.create({
      data: {
        name,
        financialYear,
        organizationId: orgId,
        items: items?.length
          ? {
              create: items.map(
                (item: {
                  accountId: string
                  jan?: number
                  feb?: number
                  mar?: number
                  apr?: number
                  may?: number
                  jun?: number
                  jul?: number
                  aug?: number
                  sep?: number
                  oct?: number
                  nov?: number
                  dec?: number
                  notes?: string
                }) => {
                  const jan = item.jan ?? 0
                  const feb = item.feb ?? 0
                  const mar = item.mar ?? 0
                  const apr = item.apr ?? 0
                  const may = item.may ?? 0
                  const jun = item.jun ?? 0
                  const jul = item.jul ?? 0
                  const aug = item.aug ?? 0
                  const sep = item.sep ?? 0
                  const oct = item.oct ?? 0
                  const nov = item.nov ?? 0
                  const dec = item.dec ?? 0
                  const total =
                    jan + feb + mar + apr + may + jun + jul + aug + sep + oct + nov + dec
                  return {
                    accountId: item.accountId,
                    jan,
                    feb,
                    mar,
                    apr,
                    may,
                    jun,
                    jul,
                    aug,
                    sep,
                    oct,
                    nov,
                    dec,
                    total,
                    notes: item.notes ?? null,
                  }
                }
              ),
            }
          : undefined,
      },
      include: {
        items: { include: { account: true } },
      },
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    console.error("Error creating budget:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
