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

    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: {
        id,
        employee: { organizationId: orgId },
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeNumber: true },
        },
      },
    })

    if (!leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    if (leaveRequest.status !== "Pending") {
      return NextResponse.json(
        { error: `Cannot update leave request with status "${leaveRequest.status}"` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { action, rejectionReason } = body // "approve" or "reject"

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      )
    }

    const newStatus = action === "approve" ? "Approved" : "Rejected"

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: newStatus,
        approvedBy: userId,
        approvedAt: new Date(),
        rejectionReason: action === "reject" ? (rejectionReason || null) : null,
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeNumber: true },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: action === "approve" ? "Approve" : "Reject",
        entityType: "LeaveRequest",
        entityId: id,
        details: `${action === "approve" ? "Approved" : "Rejected"} ${leaveRequest.leaveType} leave for ${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating leave request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
