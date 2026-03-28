import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateFBT } from "@/lib/payroll-tax"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const fbtYear = searchParams.get("fbtYear")

    const where: any = { organizationId: orgId }
    if (employeeId) where.employeeId = employeeId
    if (fbtYear) where.fyYear = fbtYear

    const records = await prisma.fBTRecord.findMany({
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

    // Calculate totals
    const totalGrossValue = records.reduce((sum: number, r: any) => sum + (r.grossValue || 0), 0)
    const totalTaxableValue = records.reduce((sum: number, r: any) => sum + (r.taxableValue || 0), 0)
    const totalFBTPayable = records.reduce((sum: number, r: any) => sum + (r.fbtPayable || 0), 0)

    return NextResponse.json({
      records,
      summary: {
        totalGrossValue: Math.round(totalGrossValue * 100) / 100,
        totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
        totalFBTPayable: Math.round(totalFBTPayable * 100) / 100,
        recordCount: records.length,
      },
    })
  } catch (error) {
    console.error("Error fetching FBT records:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id as string

    const body = await request.json()
    const {
      employeeId,
      benefitType,
      description,
      grossValue,
      exemptAmount,
      fbtYear,
      gstCredits,
      benefitCategory,
    } = body

    if (!employeeId || !benefitType || !grossValue || !fbtYear) {
      return NextResponse.json(
        { error: "Employee, benefit type, gross value, and FBT year are required" },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Calculate FBT
    const fbtCalc = calculateFBT(grossValue, exemptAmount || 0)

    const record = await prisma.fBTRecord.create({
      data: {
        employeeId,
        benefitType,
        grossValue,
        exemptAmount: exemptAmount || 0,
        taxableValue: fbtCalc.taxableValue,
        fbtPayable: fbtCalc.fbtPayable,
        fyYear: fbtYear,
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
        entityType: "FBTRecord",
        entityId: record.id,
        details: `Created FBT record for ${employee.firstName} ${employee.lastName} - ${benefitType} ($${grossValue})`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error("Error creating FBT record:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
