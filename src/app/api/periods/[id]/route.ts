import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unlockPeriod } from "@/lib/year-end"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string
    const { id } = await params

    const existing = await prisma.lockedPeriod.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 })
    }

    if (existing.status === "Unlocked") {
      return NextResponse.json(
        { error: "Period is already unlocked" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { reason } = body

    const period = await unlockPeriod(id, userId)

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Update",
        entityType: "LockedPeriod",
        entityId: id,
        details: `Unlocked period: ${reason || "Manual unlock"}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(period)
  } catch (error) {
    console.error("Error unlocking period:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string
    const { id } = await params

    const existing = await prisma.lockedPeriod.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 })
    }

    await prisma.lockedPeriod.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Delete",
        entityType: "LockedPeriod",
        entityId: id,
        details: `Deleted locked period record`,
        organizationId: orgId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting period:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
