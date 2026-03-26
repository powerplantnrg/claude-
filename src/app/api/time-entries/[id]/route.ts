import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const userId = (session.user as any).id as string
    const { id } = await params

    const existing = await prisma.timeEntry.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      projectId,
      taskId,
      date,
      hours,
      description,
      billable,
      hourlyRate,
      approvalStatus,
    } = body

    const data: any = {}

    if (projectId !== undefined) data.projectId = projectId
    if (taskId !== undefined) data.taskId = taskId || null
    if (date !== undefined) data.date = new Date(date)
    if (description !== undefined) data.description = description
    if (billable !== undefined) data.billable = billable
    if (hourlyRate !== undefined)
      data.hourlyRate = parseFloat(hourlyRate)

    if (hours !== undefined) {
      data.hours = parseFloat(hours)
    }

    // Handle approval
    if (approvalStatus !== undefined) {
      const validStatuses = ["Pending", "Approved", "Rejected"]
      if (!validStatuses.includes(approvalStatus)) {
        return NextResponse.json(
          { error: "Invalid approval status" },
          { status: 400 }
        )
      }
      data.approvalStatus = approvalStatus
      if (approvalStatus === "Approved" || approvalStatus === "Rejected") {
        data.approvedById = userId
      }
    }

    // Recalculate amount if hours or rate changed
    const effectiveHours = data.hours ?? existing.hours
    const effectiveRate = data.hourlyRate ?? existing.hourlyRate ?? 0
    const effectiveBillable = data.billable ?? existing.billable
    data.amount = effectiveBillable ? effectiveHours * effectiveRate : 0

    const entry = await prisma.timeEntry.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error("Error updating time entry:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const existing = await prisma.timeEntry.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      )
    }

    if (existing.billed) {
      return NextResponse.json(
        { error: "Cannot delete a billed time entry" },
        { status: 400 }
      )
    }

    await prisma.timeEntry.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting time entry:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
