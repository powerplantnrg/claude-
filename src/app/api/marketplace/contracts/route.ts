import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = (session.user as any).organizationId
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const providerId = searchParams.get("providerId")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const where: any = {
      organizationId: orgId,
    }

    if (status) {
      where.status = status
    }

    if (providerId) {
      where.providerId = providerId
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { contractNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [contracts, total] = await Promise.all([
      prisma.marketplaceContract.findMany({
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
          _count: {
            select: { milestones: true, invoices: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.marketplaceContract.count({ where }),
    ])

    return NextResponse.json({
      contracts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error listing contracts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = (session.user as any).organizationId
    const body = await request.json()

    const {
      listingId,
      bidId,
      providerId,
      title,
      description,
      agreedAmount,
      paymentTerms,
      startDate,
      endDate,
      deliverables,
      milestones,
    } = body

    if (!listingId || !providerId || !title || !agreedAmount) {
      return NextResponse.json(
        { error: "listingId, providerId, title, and agreedAmount are required" },
        { status: 400 }
      )
    }

    // Verify listing belongs to org
    const listing = await prisma.marketplaceListing.findFirst({
      where: { id: listingId, organizationId: orgId },
    })

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    // Verify provider exists
    const provider = await prisma.marketplaceProvider.findUnique({
      where: { id: providerId },
    })

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      )
    }

    // If bidId provided, verify it exists and is accepted
    if (bidId) {
      const bid = await prisma.marketplaceBid.findFirst({
        where: { id: bidId, listingId, providerId },
      })

      if (!bid) {
        return NextResponse.json(
          { error: "Bid not found" },
          { status: 404 }
        )
      }
    }

    // Auto-generate contract number MKT-CXXXX
    const lastContract = await prisma.marketplaceContract.findFirst({
      where: { contractNumber: { startsWith: "MKT-C" } },
      orderBy: { contractNumber: "desc" },
    })

    let nextNumber = 1
    if (lastContract) {
      const match = lastContract.contractNumber.match(/MKT-C(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }

    const contractNumber = `MKT-C${String(nextNumber).padStart(4, "0")}`

    // Build payment schedule from milestones
    const paymentSchedule =
      milestones && milestones.length > 0
        ? JSON.stringify(
            milestones.map((m: any, i: number) => ({
              milestone: i + 1,
              name: m.name,
              amount: m.amount,
              dueDate: m.dueDate || null,
            }))
          )
        : null

    const contract = await prisma.marketplaceContract.create({
      data: {
        organizationId: orgId,
        listingId,
        providerId,
        bidId: bidId || null,
        contractNumber,
        title,
        description: description || null,
        agreedAmount: parseFloat(String(agreedAmount)),
        paymentSchedule,
        paymentTerms: paymentTerms || null,
        status: "Draft",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        deliverables: deliverables ? JSON.stringify(deliverables) : null,
        milestones:
          milestones && milestones.length > 0
            ? {
                create: milestones.map((m: any) => ({
                  name: m.name,
                  description: m.description || null,
                  amount: parseFloat(String(m.amount)),
                  dueDate: m.dueDate ? new Date(m.dueDate) : null,
                  status: "Pending",
                  deliverableDescription: m.deliverableDescription || null,
                })),
              }
            : undefined,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
        milestones: true,
      },
    })

    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    console.error("Error creating contract:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
