import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const feed = await prisma.bankFeed.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!feed) {
      return NextResponse.json(
        { error: "Bank feed not found" },
        { status: 404 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "100")

    const where: Record<string, unknown> = { bankFeedId: id }

    if (
      status &&
      ["Pending", "Matched", "Created", "Ignored"].includes(status)
    ) {
      where.status = status
    }

    const transactions = await prisma.bankFeedTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const feed = await prisma.bankFeed.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!feed) {
      return NextResponse.json(
        { error: "Bank feed not found" },
        { status: 404 }
      )
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { transactionId, action, matchedTransactionId } = body as {
      transactionId?: string
      action?: string
      matchedTransactionId?: string
    }

    if (!transactionId || !action) {
      return NextResponse.json(
        { error: "Fields 'transactionId' and 'action' are required" },
        { status: 400 }
      )
    }

    const validActions = ["match", "create", "ignore"]
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          error: `Invalid action. Must be one of: ${validActions.join(", ")}`,
        },
        { status: 400 }
      )
    }

    const transaction = await prisma.bankFeedTransaction.findFirst({
      where: { id: transactionId, bankFeedId: id },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}

    switch (action) {
      case "match":
        if (!matchedTransactionId) {
          return NextResponse.json(
            {
              error:
                "Field 'matchedTransactionId' is required for match action",
            },
            { status: 400 }
          )
        }
        data.status = "Matched"
        data.matchedTransactionId = matchedTransactionId
        break
      case "create":
        data.status = "Created"
        break
      case "ignore":
        data.status = "Ignored"
        break
    }

    const updated = await prisma.bankFeedTransaction.update({
      where: { id: transactionId },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
