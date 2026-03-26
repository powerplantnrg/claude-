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
    if (status) where.implemented = status === "implemented"

    const strategies = await prisma.taxMinimisationStrategy.findMany({
      where,
      orderBy: { estimatedSaving: "desc" },
    })

    // Calculate total estimated savings
    const totalEstimatedSavings = strategies.reduce(
      (sum: number, s: any) => sum + (s.estimatedSaving || 0),
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
              category: s.category,
              title: s.strategy,
              description: s.description,
              estimatedSaving: s.estimatedAnnualSavings,
              applicableTo: s.applicability || "Both",
              implemented: false,
              organizationId: orgId,
            },
          })
        )
      )

      return NextResponse.json(created, { status: 201 })
    }

    // Manual strategy creation
    if (!strategyType || !description) {
      return NextResponse.json(
        { error: "Strategy type and description are required" },
        { status: 400 }
      )
    }

    const strategy = await prisma.taxMinimisationStrategy.create({
      data: {
        category: strategyType,
        title: strategyType,
        description,
        estimatedSaving: estimatedSavings || 0,
        notes: details || null,
        implemented: false,
        organizationId: orgId,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "TaxMinimisationStrategy",
        entityId: strategy.id,
        details: `Created tax strategy "${strategyType}"`,
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
