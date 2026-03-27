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
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        suggestions: {
          orderBy: { createdAt: "desc" },
        },
        listings: {
          include: {
            bids: {
              select: {
                id: true,
                status: true,
                amount: true,
                provider: {
                  select: { id: true, name: true, rating: true },
                },
              },
            },
            _count: { select: { bids: true } },
          },
        },
      },
    })

    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(requirement)
  } catch (error) {
    console.error("Error fetching requirement:", error)
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
    const userId = (session.user as any).id
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

    const data: Record<string, unknown> = {}

    const allowedFields = [
      "projectName",
      "description",
      "status",
      "totalBudget",
      "startDate",
      "endDate",
      "notes",
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "totalBudget") {
          data[field] = body[field] ? parseFloat(body[field]) : null
        } else if (field === "startDate" || field === "endDate") {
          data[field] = body[field] ? new Date(body[field]) : null
        } else {
          data[field] = body[field]
        }
      }
    }

    if (body.status === "APPROVED") {
      data.approvedById = userId
    }

    const updated = await prisma.projectRequirement.update({
      where: { id },
      data,
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        suggestions: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating requirement:", error)
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

    const orgId = (session.user as any).organizationId
    const { id } = await params

    const requirement = await prisma.projectRequirement.findFirst({
      where: { id, organizationId: orgId },
      include: {
        listings: {
          include: {
            _count: { select: { bids: true } },
          },
        },
      },
    })

    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      )
    }

    const hasActiveBids = requirement.listings.some(
      (l: any) => l._count.bids > 0
    )
    if (hasActiveBids) {
      return NextResponse.json(
        {
          error:
            "Cannot delete requirement with active listings that have bids. Close listings first.",
        },
        { status: 400 }
      )
    }

    await prisma.projectRequirement.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting requirement:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
