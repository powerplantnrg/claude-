import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        bids: {
          select: {
            id: true,
            amount: true,
            rateType: true,
            status: true,
            proposedStartDate: true,
            proposedEndDate: true,
            createdAt: true,
            provider: {
              select: {
                id: true,
                name: true,
                businessName: true,
                rating: true,
                reviewCount: true,
                verified: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { bids: true } },
      },
    })

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    // Increment view count
    await prisma.marketplaceListing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })

    // Compute bid summary
    const bidSummary = {
      totalBids: listing._count.bids,
      averageBid:
        listing.bids.length > 0
          ? listing.bids.reduce((sum, b) => sum + (b.amount || 0), 0) /
            listing.bids.length
          : null,
      lowestBid:
        listing.bids.length > 0
          ? Math.min(...listing.bids.map((b) => b.amount || Infinity))
          : null,
      highestBid:
        listing.bids.length > 0
          ? Math.max(...listing.bids.map((b) => b.amount || 0))
          : null,
      statusBreakdown: listing.bids.reduce(
        (acc: Record<string, number>, b) => {
          acc[b.status] = (acc[b.status] || 0) + 1
          return acc
        },
        {}
      ),
    }

    return NextResponse.json({
      ...listing,
      bidSummary,
    })
  } catch (error) {
    console.error("Error fetching listing:", error)
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

    const listing = await prisma.marketplaceListing.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    const body = await request.json()

    const allowedFields = [
      "title",
      "description",
      "category",
      "budget",
      "budgetType",
      "duration",
      "location",
      "remoteOk",
      "startDate",
      "endDate",
      "status",
      "visibility",
      "paymentTerms",
    ]

    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "budget") {
          data[field] = body[field] ? parseFloat(body[field]) : null
        } else if (field === "startDate" || field === "endDate") {
          data[field] = body[field] ? new Date(body[field]) : null
        } else {
          data[field] = body[field]
        }
      }
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating listing:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
