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

    const bill = await prisma.bill.findFirst({
      where: { id, organizationId: orgId },
      include: {
        contact: true,
        lines: { include: { account: true } },
      },
    })

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 })
    }

    return NextResponse.json(bill)
  } catch (error) {
    console.error("Error fetching bill:", error)
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

    const bill = await prisma.bill.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 })
    }

    const body = await request.json()
    const { status } = body

    const validTransitions: Record<string, string[]> = {
      Draft: ["Received", "Void"],
      Received: ["Paid", "Void"],
      Paid: [],
      Overdue: ["Paid", "Void"],
      Void: [],
    }

    if (!validTransitions[bill.status]?.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from "${bill.status}" to "${status}"`,
        },
        { status: 400 }
      )
    }

    const updated = await prisma.bill.update({
      where: { id },
      data: { status },
      include: {
        contact: true,
        lines: { include: { account: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating bill:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
