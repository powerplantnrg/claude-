import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const dividend = await prisma.dividend.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!dividend) {
      return NextResponse.json({ error: "Dividend not found" }, { status: 404 })
    }

    return NextResponse.json(dividend)
  } catch (error) {
    console.error("Error fetching dividend:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const dividend = await prisma.dividend.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!dividend) {
      return NextResponse.json({ error: "Dividend not found" }, { status: 404 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.status !== undefined) {
      if (body.status === "Paid" && dividend.status !== "Declared") {
        return NextResponse.json(
          { error: "Only declared dividends can be marked as paid" },
          { status: 400 }
        )
      }
      if (body.status === "Cancelled" && dividend.status === "Paid") {
        return NextResponse.json(
          { error: "Paid dividends cannot be cancelled" },
          { status: 400 }
        )
      }
      updateData.status = body.status

      // Create journal entry when paying
      if (body.status === "Paid") {
        updateData.paymentDate = new Date()
      }
    }

    if (body.recordDate !== undefined) updateData.recordDate = new Date(body.recordDate)
    if (body.paymentDate !== undefined) updateData.paymentDate = new Date(body.paymentDate)
    if (body.notes !== undefined) updateData.notes = body.notes

    const updated = await prisma.dividend.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating dividend:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
