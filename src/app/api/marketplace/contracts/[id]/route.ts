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

    const contract = await prisma.marketplaceContract.findFirst({
      where: { id, organizationId: orgId },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            businessName: true,
            email: true,
            phone: true,
            rating: true,
            reviewCount: true,
            verified: true,
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            category: true,
            budget: true,
          },
        },
        milestones: {
          orderBy: { dueDate: "asc" },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
        },
        reviews: true,
      },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(contract)
  } catch (error) {
    console.error("Error fetching contract:", error)
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

    const contract = await prisma.marketplaceContract.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { status } = body

    const validTransitions: Record<string, string[]> = {
      Draft: ["Active"],
      Active: ["OnHold", "Completed", "Terminated"],
      OnHold: ["Active", "Terminated"],
      Completed: [],
      Terminated: [],
      Disputed: ["Active", "Terminated"],
    }

    if (status) {
      const allowed = validTransitions[contract.status] || []
      if (!allowed.includes(status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${contract.status} to ${status}. Allowed: ${allowed.join(", ") || "none"}`,
          },
          { status: 400 }
        )
      }
    }

    const data: Record<string, unknown> = {}

    if (status) {
      data.status = status
    }

    if (body.notes !== undefined) {
      data.notes = body.notes
    }

    if (body.acceptedByProvider !== undefined) {
      data.acceptedByProvider = body.acceptedByProvider
      if (body.acceptedByProvider) {
        data.acceptedByProviderAt = new Date()
      }
    }

    if (body.acceptedByClient !== undefined) {
      data.acceptedByClient = body.acceptedByClient
      if (body.acceptedByClient) {
        data.acceptedByClientAt = new Date()
      }
    }

    const updated = await prisma.marketplaceContract.update({
      where: { id },
      data,
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating contract:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
