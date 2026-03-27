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

    const orgId = (session.user as any).organizationId
    const { id } = await params

    const requirement = await prisma.projectRequirement.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      )
    }

    const items = await prisma.requirementItem.findMany({
      where: { requirementId: id },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("Error fetching items:", error)
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

    const orgId = (session.user as any).organizationId
    const { id } = await params

    const requirement = await prisma.projectRequirement.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Accept a suggestion by ID or create a new item manually
    if (body.suggestionId) {
      const suggestion = await prisma.requirementSuggestion.findFirst({
        where: { id: body.suggestionId, requirementId: id },
      })

      if (!suggestion) {
        return NextResponse.json(
          { error: "Suggestion not found" },
          { status: 404 }
        )
      }

      if (suggestion.accepted) {
        return NextResponse.json(
          { error: "Suggestion already accepted" },
          { status: 400 }
        )
      }

      const userId = (session.user as any).id

      // Get max sort order
      const maxOrder = await prisma.requirementItem.findFirst({
        where: { requirementId: id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      })

      const [item] = await Promise.all([
        prisma.requirementItem.create({
          data: {
            requirementId: id,
            title: suggestion.itemTitle,
            description: suggestion.itemDescription,
            category: suggestion.category,
            quantity: suggestion.quantity,
            unitType: suggestion.unitType,
            duration: suggestion.duration,
            estimatedBudget: suggestion.estimatedCost,
            status: "PENDING",
            priority: "MEDIUM",
            sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
          },
        }),
        prisma.requirementSuggestion.update({
          where: { id: body.suggestionId },
          data: { accepted: true, acceptedById: userId },
        }),
      ])

      return NextResponse.json(item, { status: 201 })
    }

    // Manual item creation
    const {
      title,
      description,
      category,
      quantity,
      unitType,
      duration,
      frequencyDescription,
      requiredSkills,
      requiredEquipment,
      estimatedBudget,
      suggestedProviders,
      alternativeOptions,
      priority,
      sortOrder,
    } = body

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    // Get max sort order if not provided
    let order = sortOrder
    if (order === undefined || order === null) {
      const maxOrder = await prisma.requirementItem.findFirst({
        where: { requirementId: id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      })
      order = (maxOrder?.sortOrder ?? -1) + 1
    }

    const item = await prisma.requirementItem.create({
      data: {
        requirementId: id,
        title,
        description: description || null,
        category: category || null,
        quantity: quantity ? parseInt(quantity) : null,
        unitType: unitType || null,
        duration: duration || null,
        frequencyDescription: frequencyDescription || null,
        requiredSkills: requiredSkills || [],
        requiredEquipment: requiredEquipment || [],
        estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null,
        suggestedProviders: suggestedProviders || [],
        alternativeOptions: alternativeOptions || [],
        status: "PENDING",
        priority: priority || "MEDIUM",
        sortOrder: order,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("Error creating item:", error)
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

    const requirement = await prisma.projectRequirement.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { itemId, ...updates } = body

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      )
    }

    const item = await prisma.requirementItem.findFirst({
      where: { id: itemId, requirementId: id },
    })

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    const allowedFields = [
      "title",
      "description",
      "category",
      "quantity",
      "unitType",
      "duration",
      "frequencyDescription",
      "requiredSkills",
      "requiredEquipment",
      "estimatedBudget",
      "suggestedProviders",
      "alternativeOptions",
      "status",
      "priority",
      "sortOrder",
    ]

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === "estimatedBudget") {
          data[field] = updates[field] ? parseFloat(updates[field]) : null
        } else if (field === "quantity" || field === "sortOrder") {
          data[field] = updates[field] !== null ? parseInt(updates[field]) : null
        } else {
          data[field] = updates[field]
        }
      }
    }

    const updated = await prisma.requirementItem.update({
      where: { id: itemId },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating item:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const requirement = await prisma.projectRequirement.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      )
    }

    const { itemId } = await request.json()

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      )
    }

    const item = await prisma.requirementItem.findFirst({
      where: { id: itemId, requirementId: id },
    })

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      )
    }

    await prisma.requirementItem.delete({ where: { id: itemId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting item:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
