import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { suggestTaxStrategies } from "@/lib/payroll-tax"

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

    const strategies = await prisma.taxMinimisationStrategy.findMany({
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
      orderBy: { estimatedSavings: "desc" },
    })

    // Calculate total estimated savings
    const totalEstimatedSavings = strategies.reduce(
      (sum: number, s: any) => sum + (s.estimatedSavings || 0),
      0
    )

    return NextResponse.json({
      strategies,
      totalEstimatedSavings: Math.round(totalEstimatedSavings * 100) / 100,
    })
  } catch (error) {
    console.error("Error fetching tax strategies:", error)
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
      strategyType,
      description,
      estimatedSavings,
      details,
      autoSuggest,
    } = body

    // If autoSuggest is true, generate strategies for the employee
    if (autoSuggest && employeeId) {
      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, organizationId: orgId },
      })

      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }

      const suggestions = suggestTaxStrategies(
        {
          annualSalary: employee.annualSalary || 0,
          employmentType: employee.employmentType,
          superRate: employee.superRate || 11.5,
          hasHELPDebt: employee.helpDebt || false,
          hasNovatedLease: false,
        },
        {}
      )

      // Create strategy records for each suggestion
      const created = await Promise.all(
        suggestions.map((s) =>
          prisma.taxMinimisationStrategy.create({
            data: {
              employeeId,
              strategyType: s.category,
              name: s.strategy,
              description: s.description,
              estimatedSavings: s.estimatedAnnualSavings,
              applicability: s.applicability,
              status: "Suggested",
              organizationId: orgId,
            },
            include: {
              employee: {
                select: { firstName: true, lastName: true, employeeNumber: true },
              },
            },
          })
        )
      )

      return NextResponse.json(created, { status: 201 })
    }

    // Manual strategy creation
    if (!employeeId || !strategyType || !description) {
      return NextResponse.json(
        { error: "Employee, strategy type, and description are required" },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const strategy = await prisma.taxMinimisationStrategy.create({
      data: {
        employeeId,
        strategyType,
        name: strategyType,
        description,
        estimatedSavings: estimatedSavings || 0,
        details: details || null,
        status: "Proposed",
        organizationId: orgId,
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
        action: "Create",
        entityType: "TaxMinimisationStrategy",
        entityId: strategy.id,
        details: `Created tax strategy "${strategyType}" for ${employee.firstName} ${employee.lastName}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(strategy, { status: 201 })
  } catch (error) {
    console.error("Error creating tax strategy:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
