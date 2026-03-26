import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateNovatedLeaseSavings, calculateFBT } from "@/lib/payroll-tax"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const status = searchParams.get("status")

    const where: any = { organizationId: orgId }
    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status

    const leases = await prisma.novatedLease.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNumber: true,
            annualSalary: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    })

    // Enrich with savings calculations
    const enriched = leases.map((lease: any) => {
      const savings = calculateNovatedLeaseSavings(
        lease.employee.annualSalary || 0,
        lease.preTaxDeduction || 0,
        lease.postTaxDeduction || 0
      )
      return { ...lease, calculatedSavings: savings }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Error fetching novated leases:", error)
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
    const {
      employeeId,
      vehicleDescription,
      leaseProvider,
      startDate,
      endDate,
      totalLeaseValue,
      annualLeaseCost,
      preTaxDeduction,
      postTaxDeduction,
      fbtExemptAmount,
      includesRunningCosts,
    } = body

    if (!employeeId || !vehicleDescription || !startDate || !endDate || !annualLeaseCost) {
      return NextResponse.json(
        { error: "Employee, vehicle description, start date, end date, and annual lease cost are required" },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Calculate FBT and savings
    const fbt = calculateFBT(annualLeaseCost, fbtExemptAmount || 0)
    const savings = calculateNovatedLeaseSavings(
      employee.annualSalary || 0,
      preTaxDeduction || 0,
      postTaxDeduction || 0
    )

    const lease = await prisma.novatedLease.create({
      data: {
        employeeId,
        vehicleDescription,
        leaseProvider: leaseProvider || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalLeaseValue: totalLeaseValue || null,
        annualLeaseCost,
        preTaxDeduction: preTaxDeduction || 0,
        postTaxDeduction: postTaxDeduction || 0,
        fbtValue: fbt.fbtPayable,
        fbtExemptAmount: fbtExemptAmount || 0,
        estimatedAnnualSavings: savings.annualSavings,
        includesRunningCosts: includesRunningCosts || false,
        status: "Active",
        organizationId: orgId,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNumber: true,
            annualSalary: true,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "NovatedLease",
        entityId: lease.id,
        details: `Created novated lease for ${employee.firstName} ${employee.lastName} - ${vehicleDescription}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(
      { ...lease, calculatedSavings: savings, fbtCalculation: fbt },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating novated lease:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
