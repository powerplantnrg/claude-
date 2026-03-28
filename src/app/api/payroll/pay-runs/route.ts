import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePAYG, calculateSuperannuation } from "@/lib/payroll-tax"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: any = { organizationId: orgId }
    if (status) {
      where.status = status
    }

    const payRuns = await prisma.payRun.findMany({
      where,
      include: {
        _count: { select: { payslips: true } },
      },
      orderBy: { payPeriodEnd: "desc" },
    })

    return NextResponse.json(payRuns)
  } catch (error) {
    console.error("Error fetching pay runs:", error)
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
    const { payPeriodStart, payPeriodEnd, payDate, payFrequency, notes } = body

    if (!payPeriodStart || !payPeriodEnd || !payDate) {
      return NextResponse.json(
        { error: "Pay period start, end, and pay date are required" },
        { status: 400 }
      )
    }

    // Fetch all active employees matching the pay frequency
    const employeeWhere: any = {
      organizationId: orgId,
      active: true,
    }
    if (payFrequency) {
      employeeWhere.payFrequency = payFrequency
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
    })

    if (employees.length === 0) {
      return NextResponse.json(
        { error: "No active employees found for this pay frequency" },
        { status: 400 }
      )
    }

    // Calculate period in days for pro-rating
    const periodStart = new Date(payPeriodStart)
    const periodEnd = new Date(payPeriodEnd)
    const periodDays = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    // Determine annualisation factor based on frequency
    const frequencyFactors: Record<string, number> = {
      Weekly: 52,
      Fortnightly: 26,
      Monthly: 12,
    }

    // Generate draft payslips for each employee
    const payslipData = employees.map((emp: any) => {
      const freq = emp.payFrequency || "Fortnightly"
      const factor = frequencyFactors[freq] || 26

      let grossEarnings = 0
      if (emp.annualSalary) {
        grossEarnings = emp.annualSalary / factor
      } else if (emp.hourlyRate) {
        // Assume standard hours for draft — can be adjusted later
        const standardHours = freq === "Weekly" ? 38 : freq === "Fortnightly" ? 76 : 152
        grossEarnings = emp.hourlyRate * standardHours
      }

      // Calculate tax for the period based on annualised income
      const annualised = grossEarnings * factor
      const annualTax = calculatePAYG(
        annualised,
        emp.residencyStatus || "resident",
        emp.taxFreeThreshold !== false,
        emp.helpDebt || false,
        emp.sfssDebt || false,
        emp.medicareLevyExemption || false
      )

      const periodTax = annualTax.totalTax / factor
      const superAmount = calculateSuperannuation(grossEarnings, (emp.superRate || 11.5) / 100)
      const netPay = grossEarnings - periodTax

      return {
        employeeId: emp.id,
        grossEarnings: Math.round(grossEarnings * 100) / 100,
        taxWithheld: Math.round(periodTax * 100) / 100,
        superContribution: superAmount,
        netPay: Math.round(netPay * 100) / 100,
        hoursWorked: emp.hourlyRate ? (freq === "Weekly" ? 38 : freq === "Fortnightly" ? 76 : 152) : null,
        status: "Draft",
      }
    })

    const totalGross = payslipData.reduce((sum: number, p: any) => sum + p.grossEarnings, 0)
    const totalTax = payslipData.reduce((sum: number, p: any) => sum + p.taxWithheld, 0)
    const totalSuper = payslipData.reduce((sum: number, p: any) => sum + p.superContribution, 0)
    const totalNet = payslipData.reduce((sum: number, p: any) => sum + p.netPay, 0)

    const payRun = await prisma.payRun.create({
      data: {
        payPeriodStart: new Date(payPeriodStart),
        payPeriodEnd: new Date(payPeriodEnd),
        payDate: new Date(payDate),
        status: "Draft",
        totalGross: Math.round(totalGross * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalSuper: Math.round(totalSuper * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        notes: notes || null,
        organizationId: orgId,
        payslips: {
          create: payslipData.map((p: any) => ({
            employeeId: p.employeeId,
            grossPay: p.grossEarnings,
            taxWithheld: p.taxWithheld,
            superContribution: p.superContribution,
            netPay: p.netPay,
            hoursWorked: p.hoursWorked || 0,
            status: p.status,
            payPeriodStart: new Date(payPeriodStart),
            payPeriodEnd: new Date(payPeriodEnd),
            payDate: new Date(payDate),
            organizationId: orgId,
          })),
        },
      },
      include: {
        payslips: {
          include: {
            employee: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "PayRun",
        entityId: payRun.id,
        details: `Created pay run for ${employees.length} employees, total gross $${totalGross.toFixed(2)}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(payRun, { status: 201 })
  } catch (error) {
    console.error("Error creating pay run:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
