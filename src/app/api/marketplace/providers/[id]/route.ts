import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const provider = await prisma.marketplaceProvider.findUnique({
      where: { id },
      include: {
        capabilities: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            rating: true,
            qualityRating: true,
            timelinessRating: true,
            communicationRating: true,
            valueRating: true,
            comment: true,
            createdAt: true,
          },
        },
        contracts: {
          where: { status: "COMPLETED" },
          select: {
            id: true,
            title: true,
            agreedAmount: true,
            status: true,
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            reviews: true,
            contracts: true,
            bids: true,
          },
        },
      },
    })

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(provider)
  } catch (error) {
    console.error("Error fetching provider:", error)
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

    const userId = (session.user as any).id
    const { id } = await params

    const provider = await prisma.marketplaceProvider.findUnique({
      where: { id },
    })

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      )
    }

    if (provider.userId !== userId) {
      return NextResponse.json(
        { error: "You can only update your own provider profile" },
        { status: 403 }
      )
    }

    const body = await request.json()

    const allowedFields = [
      "name",
      "businessName",
      "abn",
      "email",
      "phone",
      "website",
      "description",
      "category",
      "subcategories",
      "qualifications",
      "location",
      "serviceArea",
      "hourlyRate",
      "dailyRate",
      "preferredPayment",
      "notes",
    ]

    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "hourlyRate" || field === "dailyRate") {
          data[field] = body[field] ? parseFloat(body[field]) : null
        } else {
          data[field] = body[field]
        }
      }
    }

    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    const updated = await prisma.marketplaceProvider.update({
      where: { id },
      data,
      include: { capabilities: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating provider:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { id } = await params

    const provider = await prisma.marketplaceProvider.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contracts: true },
        },
      },
    })

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      )
    }

    if (provider.userId !== userId) {
      return NextResponse.json(
        { error: "You can only deactivate your own provider profile" },
        { status: 403 }
      )
    }

    const activeContracts = await prisma.marketplaceContract.count({
      where: {
        providerId: id,
        status: { in: ["ACTIVE", "IN_PROGRESS"] },
      },
    })

    if (activeContracts > 0) {
      return NextResponse.json(
        {
          error: `Cannot deactivate provider with ${activeContracts} active contract(s). Complete or terminate contracts first.`,
        },
        { status: 400 }
      )
    }

    await prisma.marketplaceProvider.update({
      where: { id },
      data: { status: "INACTIVE" },
    })

    return NextResponse.json({ success: true, message: "Provider deactivated" })
  } catch (error) {
    console.error("Error deactivating provider:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
