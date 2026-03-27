import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id
    const { id } = await params

    const contract = await prisma.marketplaceContract.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    if (contract.status !== "Completed") {
      return NextResponse.json(
        { error: "Reviews can only be submitted for Completed contracts" },
        { status: 400 }
      )
    }

    // Check if review already exists for this contract by this org
    const existingReview = await prisma.providerReview.findFirst({
      where: { contractId: id, organizationId: orgId },
    })

    if (existingReview) {
      return NextResponse.json(
        { error: "A review has already been submitted for this contract" },
        { status: 409 }
      )
    }

    const body = await request.json()

    const {
      rating,
      qualityRating,
      timelinessRating,
      communicationRating,
      valueRating,
      comment,
    } = body

    if (!rating) {
      return NextResponse.json(
        { error: "Overall rating is required" },
        { status: 400 }
      )
    }

    // Validate ratings are 1-5
    const ratings = [
      { name: "rating", value: rating },
      { name: "qualityRating", value: qualityRating },
      { name: "timelinessRating", value: timelinessRating },
      { name: "communicationRating", value: communicationRating },
      { name: "valueRating", value: valueRating },
    ]

    for (const r of ratings) {
      if (r.value !== undefined && r.value !== null) {
        const val = parseInt(String(r.value))
        if (isNaN(val) || val < 1 || val > 5) {
          return NextResponse.json(
            { error: `${r.name} must be between 1 and 5` },
            { status: 400 }
          )
        }
      }
    }

    const review = await prisma.providerReview.create({
      data: {
        contractId: id,
        providerId: contract.providerId,
        organizationId: orgId,
        reviewerId: userId,
        rating: parseInt(String(rating)),
        qualityRating: qualityRating ? parseInt(String(qualityRating)) : null,
        timelinessRating: timelinessRating
          ? parseInt(String(timelinessRating))
          : null,
        communicationRating: communicationRating
          ? parseInt(String(communicationRating))
          : null,
        valueRating: valueRating ? parseInt(String(valueRating)) : null,
        comment: comment || null,
      },
    })

    // Update provider's average rating and review count
    const allReviews = await prisma.providerReview.findMany({
      where: { providerId: contract.providerId },
      select: { rating: true },
    })

    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length

    await prisma.marketplaceProvider.update({
      where: { id: contract.providerId },
      data: {
        rating: Math.round(avgRating * 100) / 100,
        reviewCount: allReviews.length,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error("Error creating review:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
