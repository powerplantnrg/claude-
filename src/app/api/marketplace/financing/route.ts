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
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const where: any = {
      organizationId: orgId,
    }

    if (status) {
      where.status = status
    }

    const [requests, total] = await Promise.all([
      prisma.quarterlyFinancingRequest.findMany({
        where,
        include: {
          contract: {
            select: {
              id: true,
              contractNumber: true,
              title: true,
              agreedAmount: true,
              status: true,
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
              businessName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { startQuarter: "desc" },
      }),
      prisma.quarterlyFinancingRequest.count({ where }),
    ])

    return NextResponse.json({
      financingRequests: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error listing financing requests:", error)
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
      contractId,
      totalAmount,
      numberOfQuarters,
      startQuarter,
      interestRate,
      notes,
    } = body

    if (!contractId || !totalAmount || !numberOfQuarters || !startQuarter) {
      return NextResponse.json(
        {
          error:
            "contractId, totalAmount, numberOfQuarters, and startQuarter are required",
        },
        { status: 400 }
      )
    }

    // Validate contract exists, belongs to org, and is Active
    const contract = await prisma.marketplaceContract.findFirst({
      where: { id: contractId, organizationId: orgId },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    if (contract.status !== "Active") {
      return NextResponse.json(
        {
          error:
            "Financing requests can only be created for Active contracts",
        },
        { status: 400 }
      )
    }

    const parsedTotal = parseFloat(String(totalAmount))
    const parsedQuarters = parseInt(String(numberOfQuarters))

    if (parsedQuarters <= 0) {
      return NextResponse.json(
        { error: "numberOfQuarters must be greater than 0" },
        { status: 400 }
      )
    }

    const quarterlyAmount = parsedTotal / parsedQuarters

    const financingRequest = await prisma.quarterlyFinancingRequest.create({
      data: {
        organizationId: orgId,
        contractId,
        providerId: contract.providerId,
        totalAmount: parsedTotal,
        quarterlyAmount,
        numberOfQuarters: parsedQuarters,
        startQuarter,
        status: "Requested",
        interestRate: interestRate ? parseFloat(String(interestRate)) : 0,
        notes: notes || null,
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNumber: true,
            title: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
      },
    })

    return NextResponse.json(financingRequest, { status: 201 })
  } catch (error) {
    console.error("Error creating financing request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
