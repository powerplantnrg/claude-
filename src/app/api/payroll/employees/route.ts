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
    const search = searchParams.get("search")
    const employmentType = searchParams.get("type")
    const active = searchParams.get("active")

    const where: any = { organizationId: orgId }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    if (employmentType) {
      where.employmentType = employmentType
    }

    if (active !== null && active !== undefined) {
      where.active = active === "true"
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { lastName: "asc" },
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error("Error fetching employees:", error)
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
      firstName,
      lastName,
      email,
      employmentType,
      jobTitle,
      department,
      startDate,
      annualSalary,
      hourlyRate,
      payFrequency,
      taxFileNumber,
      superFundName,
      superMemberNumber,
      superRate,
      bankBsb,
      bankAccountNumber,
      bankAccountName,
      residencyStatus,
      taxFreeThreshold,
      helpDebt,
      sfssDebt,
      medicareLevyExemption,
    } = body

    if (!firstName || !lastName || !email || !employmentType || !startDate) {
      return NextResponse.json(
        { error: "First name, last name, email, employment type, and start date are required" },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        email,
        employmentType,
        startDate: new Date(startDate),
        annualSalary: annualSalary || null,
        hourlyRate: hourlyRate || null,
        payFrequency: payFrequency || "Fortnightly",
        taxFileNumber: taxFileNumber || null,
        superFundName: superFundName || null,
        superMemberNumber: superMemberNumber || null,
        superRate: superRate || 11.5,
        bankBSB: bankBsb || null,
        bankAccountNumber: bankAccountNumber || null,
        bankAccountName: bankAccountName || null,
        residencyStatus: residencyStatus || "resident",
        taxFreeThreshold: taxFreeThreshold !== false,
        helpDebt: helpDebt || false,
        sfssDebt: sfssDebt || false,
        medicareLevyExemption: medicareLevyExemption || "None",
        active: true,
        organizationId: orgId,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "Employee",
        entityId: employee.id,
        details: `Created employee ${firstName} ${lastName}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
