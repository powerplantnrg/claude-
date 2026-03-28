import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const claims = await prisma.expenseClaim.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { name: true, email: true } },
        items: true,
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(claims)
  } catch (error) {
    console.error("Error fetching expense claims:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id as string

    const body = await req.json()
    const { date, notes, status, items } = body

    if (!date || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Date and at least one item are required" },
        { status: 400 }
      )
    }

    // Generate claim number
    const count = await prisma.expenseClaim.count({
      where: { organizationId: orgId },
    })
    const claimNumber = `EXP-${String(count + 1).padStart(4, "0")}`

    // Calculate total
    const totalAmount = items.reduce(
      (sum: number, item: { amount: number; taxAmount?: number }) =>
        sum + item.amount + (item.taxAmount || 0),
      0
    )

    const claim = await prisma.expenseClaim.create({
      data: {
        organizationId: orgId,
        userId,
        claimNumber,
        date: new Date(date),
        status: status || "Draft",
        totalAmount,
        notes: notes || null,
        items: {
          create: items.map(
            (item: {
              date: string
              description: string
              category: string
              amount: number
              taxAmount?: number
              accountId?: string
              receiptPath?: string
              rdProjectId?: string
            }) => ({
              date: new Date(item.date),
              description: item.description,
              category: item.category,
              amount: item.amount,
              taxAmount: item.taxAmount || 0,
              accountId: item.accountId || null,
              receiptPath: item.receiptPath || null,
              rdProjectId: item.rdProjectId || null,
            })
          ),
        },
      },
      include: {
        user: { select: { name: true, email: true } },
        items: true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "ExpenseClaim",
        entityId: claim.id,
        details: `Created expense claim ${claimNumber} for $${totalAmount.toFixed(2)}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(claim, { status: 201 })
  } catch (error) {
    console.error("Error creating expense claim:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
