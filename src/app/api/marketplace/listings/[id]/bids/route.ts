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

    // Verify the listing belongs to the org or the user is a provider who bid
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
    })

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")

    const where: any = { listingId: id }
    if (status) where.status = status

    // If org owns the listing, show all bids; otherwise only show own bids
    if (listing.organizationId !== orgId) {
      const userId = (session.user as any).id
      const userEmail = (session.user as any).email
      const provider = await prisma.marketplaceProvider.findFirst({
        where: { email: userEmail },
      })
      if (provider) {
        where.providerId = provider.id
      } else {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        )
      }
    }

    const bids = await prisma.marketplaceBid.findMany({
      where,
      include: {
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
    })

    return NextResponse.json(bids)
  } catch (error) {
    console.error("Error fetching bids:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { id } = await params

    // Check user has a provider profile
    const provider = await prisma.marketplaceProvider.findFirst({
      where: { userId, status: "ACTIVE" },
    })

    if (!provider) {
      return NextResponse.json(
        { error: "You must have an active provider profile to submit bids" },
        { status: 403 }
      )
    }

    // Verify listing exists and is open
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
    })

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    if (listing.status !== "OPEN") {
      return NextResponse.json(
        { error: "This listing is no longer accepting bids" },
        { status: 400 }
      )
    }

    // Prevent duplicate active bids
    const existingBid = await prisma.marketplaceBid.findFirst({
      where: {
        listingId: id,
        providerId: provider.id,
        status: { in: ["SUBMITTED", "SHORTLISTED"] },
      },
    })

    if (existingBid) {
      return NextResponse.json(
        { error: "You already have an active bid on this listing" },
        { status: 409 }
      )
    }

    const body = await request.json()

    const {
      bidType,
      amount,
      rateType,
      proposedStartDate,
      proposedEndDate,
      proposalDescription,
      includedServices,
      exclusions,
      paymentPreference,
    } = body

    if (!amount || !proposalDescription) {
      return NextResponse.json(
        { error: "Amount and proposal description are required" },
        { status: 400 }
      )
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "Bid amount must be greater than zero" },
        { status: 400 }
      )
    }

    const bid = await prisma.marketplaceBid.create({
      data: {
        listingId: id,
        providerId: provider.id,
        bidType: bidType || "FIXED",
        amount: parseFloat(amount),
        rateType: rateType || null,
        proposedStartDate: proposedStartDate
          ? new Date(proposedStartDate)
          : null,
        proposedEndDate: proposedEndDate ? new Date(proposedEndDate) : null,
        proposalDescription,
        includedServices: includedServices || [],
        exclusions: exclusions || [],
        paymentPreference: paymentPreference || null,
        status: "SUBMITTED",
      },
      include: {
        provider: {
          select: { id: true, name: true, businessName: true },
        },
        listing: {
          select: { id: true, title: true },
        },
      },
    })

    // Increment response count on listing
    await prisma.marketplaceListing.update({
      where: { id },
      data: { responseCount: { increment: 1 } },
    })

    return NextResponse.json(bid, { status: 201 })
  } catch (error) {
    console.error("Error submitting bid:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
