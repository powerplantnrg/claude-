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

    const invoices = await prisma.contractInvoice.findMany({
      where: { contractId: id },
      include: {
        milestone: {
          select: {
            id: true,
            name: true,
            amount: true,
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
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
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

    // Verify contract exists, belongs to org, and is Active
    const contract = await prisma.marketplaceContract.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    if (contract.status !== "Active") {
      return NextResponse.json(
        { error: "Invoices can only be submitted for Active contracts" },
        { status: 400 }
      )
    }

    const body = await request.json()

    const {
      milestoneId,
      providerId,
      invoiceNumber,
      amount,
      gstAmount,
      description,
      notes,
    } = body

    if (!providerId || !invoiceNumber || amount === undefined) {
      return NextResponse.json(
        { error: "providerId, invoiceNumber, and amount are required" },
        { status: 400 }
      )
    }

    // Verify provider exists and matches contract
    if (providerId !== contract.providerId) {
      return NextResponse.json(
        { error: "Provider does not match the contract provider" },
        { status: 400 }
      )
    }

    const invoiceAmount = parseFloat(String(amount))
    const invoiceGst = gstAmount ? parseFloat(String(gstAmount)) : 0
    const totalAmount = invoiceAmount + invoiceGst

    // CRITICAL: Validate milestone reference
    if (milestoneId) {
      const milestone = await prisma.contractMilestone.findFirst({
        where: { id: milestoneId, contractId: id },
      })

      if (!milestone) {
        return NextResponse.json(
          {
            error:
              "Invalid milestoneId: milestone does not belong to this contract",
          },
          { status: 400 }
        )
      }

      // Validate invoice amount does not exceed milestone amount
      if (invoiceAmount > milestone.amount) {
        return NextResponse.json(
          {
            error: `Invoice amount ($${invoiceAmount}) exceeds milestone amount ($${milestone.amount})`,
          },
          { status: 400 }
        )
      }

      // Check for existing invoices on this milestone to prevent over-billing
      const existingInvoices = await prisma.contractInvoice.findMany({
        where: {
          milestoneId,
          status: { notIn: ["Rejected"] },
        },
      })

      const existingTotal = existingInvoices.reduce(
        (sum, inv) => sum + inv.amount,
        0
      )

      if (existingTotal + invoiceAmount > milestone.amount) {
        return NextResponse.json(
          {
            error: `Total invoiced amount ($${existingTotal + invoiceAmount}) would exceed milestone amount ($${milestone.amount}). Already invoiced: $${existingTotal}`,
          },
          { status: 400 }
        )
      }
    } else {
      // If no milestoneId, reject - invoices must reference a valid milestone
      return NextResponse.json(
        {
          error:
            "milestoneId is required. Invoices must reference a valid contract milestone.",
        },
        { status: 400 }
      )
    }

    const invoice = await prisma.contractInvoice.create({
      data: {
        contractId: id,
        milestoneId,
        providerId,
        organizationId: orgId,
        invoiceNumber,
        amount: invoiceAmount,
        gstAmount: invoiceGst,
        totalAmount,
        description: description || null,
        status: "Submitted",
        submittedAt: new Date(),
        notes: notes || null,
      },
      include: {
        milestone: {
          select: { id: true, name: true, amount: true },
        },
        provider: {
          select: { id: true, name: true, businessName: true },
        },
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
