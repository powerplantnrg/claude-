import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const employee = await prisma.employee.findFirst({
      where: { id, organizationId: orgId },
      include: {
        leaveRequests: {
          where: { status: "Approved" },
          orderBy: { startDate: "desc" },
          take: 10,
        },
        payslips: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            payRun: {
              select: { payPeriodStart: true, payPeriodEnd: true, status: true },
            },
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Calculate leave balances from approved leave requests
    const allLeave = await prisma.leaveRequest.findMany({
      where: { employeeId: id, status: "Approved" },
    })

    const leaveBalances = {
      annualLeave: 20 - allLeave
        .filter((l: any) => l.leaveType === "Annual")
        .reduce((sum: number, l: any) => sum + l.days, 0),
      sickLeave: 10 - allLeave
        .filter((l: any) => l.leaveType === "Sick")
        .reduce((sum: number, l: any) => sum + l.days, 0),
      personalLeave: 10 - allLeave
        .filter((l: any) => l.leaveType === "Personal")
        .reduce((sum: number, l: any) => sum + l.days, 0),
      longServiceLeave: 0,
    }

    return NextResponse.json({ ...employee, leaveBalances })
  } catch (error) {
    console.error("Error fetching employee:", error)
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id as string
    const { id } = await params

    const existing = await prisma.employee.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const body = await request.json()

    // Remove fields that should not be directly updated
    delete body.id
    delete body.organizationId
    delete body.employeeNumber

    if (body.startDate) body.startDate = new Date(body.startDate)
    if (body.endDate) body.endDate = new Date(body.endDate)

    const updated = await prisma.employee.update({
      where: { id },
      data: body,
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Update",
        entityType: "Employee",
        entityId: id,
        details: `Updated employee ${existing.firstName} ${existing.lastName}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating employee:", error)
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id as string
    const { id } = await params

    const existing = await prisma.employee.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Soft delete — deactivate rather than remove
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        active: false,
        endDate: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Deactivate",
        entityType: "Employee",
        entityId: id,
        details: `Deactivated employee ${existing.firstName} ${existing.lastName}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error deactivating employee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
