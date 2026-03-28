import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
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
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 50,
        },
        _count: {
          select: { transactions: true },
        },
      },
    })

    if (!feed) {
      return NextResponse.json(
        { error: "Bank feed not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(feed)
  } catch (error) {
    console.error("Error fetching bank feed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
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

    const { status } = body as { status?: string }

    if (status !== undefined) {
      const validStatuses = ["Active", "Paused", "Disconnected"]
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          },
          { status: 400 }
        )
      }
    }

    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status

    const updated = await prisma.bankFeed.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating bank feed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
