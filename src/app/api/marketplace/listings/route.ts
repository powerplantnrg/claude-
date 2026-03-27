import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const location = searchParams.get("location")
    const minBudget = searchParams.get("minBudget")
    const maxBudget = searchParams.get("maxBudget")
    const status = searchParams.get("status")
    const remoteOk = searchParams.get("remoteOk")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const where: any = {
      status: status || "OPEN",
      visibility: "PUBLIC",
    }

    if (category) {
      where.category = category
    }

    if (location) {
      where.location = { contains: location, mode: "insensitive" }
    }

    if (minBudget || maxBudget) {
      where.budget = {}
      if (minBudget) where.budget.gte = parseFloat(minBudget)
      if (maxBudget) where.budget.lte = parseFloat(maxBudget)
    }

    if (remoteOk === "true") {
      where.remoteOk = true
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          budget: true,
          budgetType: true,
          duration: true,
          location: true,
          remoteOk: true,
          startDate: true,
          endDate: true,
          status: true,
          viewCount: true,
          responseCount: true,
          createdAt: true,
          _count: { select: { bids: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.marketplaceListing.count({ where }),
    ])

    return NextResponse.json({
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error listing marketplace listings:", error)
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
      requirementId,
      requirementItemId,
      title,
      description,
      category,
      budget,
      budgetType,
      duration,
      location,
      remoteOk,
      startDate,
      endDate,
      visibility,
      paymentTerms,
    } = body

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    // If publishing from a requirement, verify ownership
    if (requirementId) {
      const requirement = await prisma.projectRequirement.findFirst({
        where: { id: requirementId, organizationId: orgId },
      })

      if (!requirement) {
        return NextResponse.json(
          { error: "Requirement not found" },
          { status: 404 }
        )
      }
    }

    // If linked to a specific item, verify it
    if (requirementItemId) {
      const item = await prisma.requirementItem.findFirst({
        where: { id: requirementItemId, requirementId: requirementId || undefined },
      })

      if (!item) {
        return NextResponse.json(
          { error: "Requirement item not found" },
          { status: 404 }
        )
      }
    }

    const listing = await prisma.marketplaceListing.create({
      data: {
        organizationId: orgId,
        requirementId: requirementId || null,
        requirementItemId: requirementItemId || null,
        title,
        description: description || null,
        category: category || null,
        budget: budget ? parseFloat(budget) : null,
        budgetType: budgetType || "FIXED",
        duration: duration || null,
        location: location || null,
        remoteOk: remoteOk ?? false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: "OPEN",
        visibility: visibility || "PUBLIC",
        paymentTerms: paymentTerms || null,
        viewCount: 0,
        responseCount: 0,
      },
    })

    return NextResponse.json(listing, { status: 201 })
  } catch (error) {
    console.error("Error creating listing:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
