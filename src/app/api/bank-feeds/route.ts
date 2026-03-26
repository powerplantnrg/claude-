import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")

  const where: Record<string, unknown> = { organizationId: orgId }

  if (status && ["Active", "Paused", "Disconnected"].includes(status)) {
    where.status = status
  }

  const feeds = await prisma.bankFeed.findMany({
    where,
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { bankName: "asc" },
  })

  return NextResponse.json(feeds)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { bankName, accountNumber, accountName, feedType, connectionRef } =
    body as {
      bankName?: string
      accountNumber?: string
      accountName?: string
      feedType?: string
      connectionRef?: string
    }

  if (!bankName || !accountNumber || !accountName) {
    return NextResponse.json(
      {
        error:
          "Fields 'bankName', 'accountNumber', and 'accountName' are required",
      },
      { status: 400 }
    )
  }

  const validFeedTypes = ["Direct", "FileImport"]
  const resolvedFeedType = feedType ?? "Direct"
  if (!validFeedTypes.includes(resolvedFeedType)) {
    return NextResponse.json(
      {
        error: `Invalid feedType. Must be one of: ${validFeedTypes.join(", ")}`,
      },
      { status: 400 }
    )
  }

  const feed = await prisma.bankFeed.create({
    data: {
      bankName,
      accountNumber,
      accountName,
      feedType: resolvedFeedType,
      connectionRef: connectionRef ?? null,
      status: "Active",
      organizationId: orgId,
    },
  })

  return NextResponse.json(feed, { status: 201 })
}
