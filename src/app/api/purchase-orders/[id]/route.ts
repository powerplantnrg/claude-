import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const purchaseOrder = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: orgId },
    include: {
      contact: { select: { id: true, name: true } },
      lines: true,
    },
  })

  if (!purchaseOrder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(purchaseOrder)
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  Draft: ["Sent", "Cancelled"],
  Sent: ["Received", "Cancelled"],
  Received: ["Billed", "Cancelled"],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  try {
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      )
    }

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const allowed = VALID_TRANSITIONS[purchaseOrder.status]
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from "${purchaseOrder.status}" to "${status}"`,
        },
        { status: 400 }
      )
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: {
        contact: { select: { id: true, name: true } },
        lines: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json(
      { error: "Failed to update purchase order" },
      { status: 500 }
    )
  }
}
