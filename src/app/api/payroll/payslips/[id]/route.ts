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

    const payslip = await prisma.payslip.findFirst({
      where: {
        id,
        payRun: { organizationId: orgId },
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNumber: true,
            email: true,
            jobTitle: true,
            department: true,
            taxFileNumber: true,
            superFundName: true,
            superMemberNumber: true,
          },
        },
        payRun: {
          select: {
            payRunNumber: true,
            payPeriodStart: true,
            payPeriodEnd: true,
            payDate: true,
            payFrequency: true,
            status: true,
          },
        },
        earnings: true,
        deductions: true,
        leave: true,
      },
    })

    if (!payslip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 })
    }

    return NextResponse.json(payslip)
  } catch (error) {
    console.error("Error fetching payslip:", error)
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
    const userId = (session.user as any).id as string
    const { id } = await params

    const payslip = await prisma.payslip.findFirst({
      where: {
        id,
        payRun: { organizationId: orgId },
      },
      include: { payRun: true },
    })

    if (!payslip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 })
    }

    if (payslip.status !== "Draft") {
      return NextResponse.json(
        { error: "Only draft payslips can be modified" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      grossEarnings,
      hoursWorked,
      earnings,
      deductions,
      leave,
    } = body

    // Update basic payslip fields
    const updateData: any = {}
    if (grossEarnings !== undefined) updateData.grossEarnings = grossEarnings
    if (hoursWorked !== undefined) updateData.hoursWorked = hoursWorked

    // Update earnings line items
    if (earnings && Array.isArray(earnings)) {
      // Remove existing earnings and recreate
      await prisma.payslipEarning.deleteMany({ where: { payslipId: id } })
      await prisma.payslipEarning.createMany({
        data: earnings.map((e: any) => ({
          payslipId: id,
          name: e.name,
          type: e.type || "Allowance",
          hours: e.hours || null,
          rate: e.rate || null,
          amount: e.amount,
        })),
      })
    }

    // Update deductions
    if (deductions && Array.isArray(deductions)) {
      await prisma.payslipDeduction.deleteMany({ where: { payslipId: id } })
      await prisma.payslipDeduction.createMany({
        data: deductions.map((d: any) => ({
          payslipId: id,
          name: d.name,
          type: d.type || "Other",
          amount: d.amount,
          preTax: d.preTax || false,
        })),
      })
    }

    // Update leave entries
    if (leave && Array.isArray(leave)) {
      await prisma.payslipLeave.deleteMany({ where: { payslipId: id } })
      await prisma.payslipLeave.createMany({
        data: leave.map((l: any) => ({
          payslipId: id,
          leaveType: l.leaveType,
          hours: l.hours,
          amount: l.amount || 0,
        })),
      })
    }

    const updated = await prisma.payslip.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeNumber: true },
        },
        earnings: true,
        deductions: true,
        leave: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Update",
        entityType: "Payslip",
        entityId: id,
        details: `Updated payslip for pay run ${payslip.payRun.payRunNumber}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating payslip:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
