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
    const rdProjectId = searchParams.get("rdProjectId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const where: any = { organizationId: orgId }
    if (status) where.status = status
    if (rdProjectId) where.rdProjectId = rdProjectId

    const [requirements, total] = await Promise.all([
      prisma.projectRequirement.findMany({
        where,
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
          listings: {
            select: { id: true, status: true, title: true },
          },
          _count: {
            select: { items: true, listings: true, suggestions: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.projectRequirement.count({ where }),
    ])

    return NextResponse.json({
      requirements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error listing requirements:", error)
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
    const userId = (session.user as any).id
    const body = await request.json()

    const {
      rdProjectId,
      projectName,
      description,
      extractedFrom,
      sourceDocumentId,
      totalBudget,
      startDate,
      endDate,
      notes,
      items,
    } = body

    if (!projectName) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      )
    }

    const requirement = await prisma.projectRequirement.create({
      data: {
        organizationId: orgId,
        rdProjectId: rdProjectId || null,
        projectName,
        description: description || null,
        status: "DRAFT",
        extractedFrom: extractedFrom || "MANUAL",
        sourceDocumentId: sourceDocumentId || null,
        createdById: userId,
        totalBudget: totalBudget ? parseFloat(totalBudget) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
        items: items?.length
          ? {
              create: items.map((item: any, index: number) => ({
                title: item.title,
                description: item.description || null,
                category: item.category || null,
                quantity: item.quantity ? parseInt(item.quantity) : null,
                unitType: item.unitType || null,
                duration: item.duration || null,
                frequencyDescription: item.frequencyDescription || null,
                requiredSkills: item.requiredSkills || [],
                requiredEquipment: item.requiredEquipment || [],
                estimatedBudget: item.estimatedBudget
                  ? parseFloat(item.estimatedBudget)
                  : null,
                suggestedProviders: item.suggestedProviders || [],
                alternativeOptions: item.alternativeOptions || [],
                status: "PENDING",
                priority: item.priority || "MEDIUM",
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    })

    return NextResponse.json(requirement, { status: 201 })
  } catch (error) {
    console.error("Error creating requirement:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
