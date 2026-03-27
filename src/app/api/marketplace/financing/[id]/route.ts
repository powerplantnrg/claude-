import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const financingRequest = await prisma.quarterlyFinancingRequest.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!financingRequest) {
      return NextResponse.json(
        { error: "Financing request not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { status, notes } = body

    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      )
    }

    const validTransitions: Record<string, string[]> = {
      Requested: ["Approved", "Rejected"],
      Approved: ["Active", "Rejected"],
      Active: ["Completed", "Defaulted"],
      Completed: [],
      Defaulted: [],
      Rejected: [],
    }

    const allowed = validTransitions[financingRequest.status] || []
    if (!allowed.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${financingRequest.status} to ${status}. Allowed: ${allowed.join(", ") || "none"}`,
        },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = { status }

    if (status === "Approved") {
      data.approvedAt = new Date()
    }

    if (notes !== undefined) {
      data.notes = notes
    }

    const updated = await prisma.quarterlyFinancingRequest.update({
      where: { id },
      data,
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating financing request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
