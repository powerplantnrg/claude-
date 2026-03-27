import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id

    const bid = await prisma.marketplaceBid.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            description: true,
            budget: true,
            organizationId: true,
          },
        },
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
    })

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 })
    }

    // Access: org that owns the listing OR the provider who bid
    const isListingOwner = bid.listing.organizationId === orgId
    const userProvider = await prisma.marketplaceProvider.findFirst({ where: { email: (session.user as any).email } })
    const isProvider = userProvider?.id === bid.providerId

    if (!isListingOwner && !isProvider) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json(bid)
  } catch (error) {
    console.error("Error fetching bid:", error)
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

    const { id } = await params
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id

    const bid = await prisma.marketplaceBid.findUnique({
      where: { id },
      include: {
        listing: {
          select: { id: true, organizationId: true },
        },
        provider: {
          select: { id: true },
        },
      },
    })

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 })
    }

    const body = await request.json()
    const { status: newStatus } = body

    if (!newStatus) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      )
    }

    const isListingOwner = bid.listing.organizationId === orgId
    const userProvider = await prisma.marketplaceProvider.findFirst({ where: { email: (session.user as any).email } })
    const isProvider = userProvider?.id === bid.provider.id

    // Validate allowed transitions based on role
    const orgAllowedStatuses = ["ACCEPTED", "REJECTED", "SHORTLISTED"]
    const providerAllowedStatuses = ["WITHDRAWN"]

    if (isListingOwner && orgAllowedStatuses.includes(newStatus)) {
      if (bid.status === "WITHDRAWN") {
        return NextResponse.json(
          { error: "Cannot update a withdrawn bid" },
          { status: 400 }
        )
      }

      if (bid.status === "ACCEPTED" && newStatus !== "REJECTED") {
        return NextResponse.json(
          { error: "Accepted bids can only be rejected (reversed)" },
          { status: 400 }
        )
      }

      const updated = await prisma.marketplaceBid.update({
        where: { id },
        data: { status: newStatus },
        include: {
          provider: {
            select: { id: true, name: true },
          },
        },
      })

      return NextResponse.json(updated)
    }

    if (isProvider && providerAllowedStatuses.includes(newStatus)) {
      if (bid.status === "ACCEPTED") {
        return NextResponse.json(
          { error: "Cannot withdraw an accepted bid. Contact the listing owner." },
          { status: 400 }
        )
      }

      const updated = await prisma.marketplaceBid.update({
        where: { id },
        data: { status: "WITHDRAWN" },
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json(
      { error: "Invalid status transition or insufficient permissions" },
      { status: 403 }
    )
  } catch (error) {
    console.error("Error updating bid:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
