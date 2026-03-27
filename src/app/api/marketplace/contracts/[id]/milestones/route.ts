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
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    const milestones = await prisma.contractMilestone.findMany({
      where: { contractId: id },
      include: {
        contractInvoices: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    })

    return NextResponse.json(milestones)
  } catch (error) {
    console.error("Error fetching milestones:", error)
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

    const { name, description, amount, dueDate, deliverableDescription } = body

    if (!name || amount === undefined) {
      return NextResponse.json(
        { error: "Name and amount are required" },
        { status: 400 }
      )
    }

    const milestone = await prisma.contractMilestone.create({
      data: {
        contractId: id,
        name,
        description: description || null,
        amount: parseFloat(String(amount)),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "Pending",
        deliverableDescription: deliverableDescription || null,
      },
    })

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    console.error("Error creating milestone:", error)
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
    const { milestoneId, action, deliverableDescription } = body

    if (!milestoneId || !action) {
      return NextResponse.json(
        { error: "milestoneId and action are required" },
        { status: 400 }
      )
    }

    const milestone = await prisma.contractMilestone.findFirst({
      where: { id: milestoneId, contractId: id },
    })

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}

    switch (action) {
      case "submit":
        if (milestone.status !== "Pending") {
          return NextResponse.json(
            { error: "Milestone must be Pending to submit a deliverable" },
            { status: 400 }
          )
        }
        data.status = "Submitted"
        data.submittedAt = new Date()
        if (deliverableDescription) {
          data.deliverableDescription = deliverableDescription
        }
        break

      case "approve":
        if (milestone.status !== "Submitted") {
          return NextResponse.json(
            { error: "Milestone must be Submitted to approve" },
            { status: 400 }
          )
        }
        data.status = "Approved"
        data.approvedById = userId
        data.approvedAt = new Date()
        break

      case "paid":
        if (milestone.status !== "Approved") {
          return NextResponse.json(
            { error: "Milestone must be Approved to mark as paid" },
            { status: 400 }
          )
        }
        data.status = "Paid"
        break

      default:
        return NextResponse.json(
          { error: "Invalid action. Allowed: submit, approve, paid" },
          { status: 400 }
        )
    }

    const updated = await prisma.contractMilestone.update({
      where: { id: milestoneId },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating milestone:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
