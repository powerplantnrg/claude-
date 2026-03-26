import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const employeeId = searchParams.get("employeeId")

    const where: any = {
      employee: { organizationId: orgId },
    }

    if (status) {
      where.status = status
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(leaveRequests)
  } catch (error) {
    console.error("Error fetching leave requests:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id as string

    const body = await request.json()
    const { employeeId, leaveType, startDate, endDate, hoursRequested, reason } = body

    if (!employeeId || !leaveType || !startDate || !endDate || !hoursRequested) {
      return NextResponse.json(
        { error: "Employee, leave type, start date, end date, and days are required" },
        { status: 400 }
      )
    }

    // Verify employee belongs to organization
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId,
        type: leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        hoursRequested,
        notes: reason || null,
        status: "Pending",
        organizationId: orgId,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "LeaveRequest",
        entityId: leaveRequest.id,
        details: `Created ${leaveType} leave request for ${employee.firstName} ${employee.lastName} (${hoursRequested} hours)`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(leaveRequest, { status: 201 })
  } catch (error) {
    console.error("Error creating leave request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
