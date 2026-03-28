import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePAYG, calculateSuperannuation, suggestTaxStrategies } from "@/lib/payroll-tax"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const financialYear = searchParams.get("fy") || "2025-26"
    const quarter = searchParams.get("quarter")
    const employeeId = searchParams.get("employeeId")

    if (!type) {
      return NextResponse.json(
        { error: "Report type is required. Options: payment-summary, payroll-tax, super-summary, tax-minimisation" },
        { status: 400 }
      )
    }

    switch (type) {
      case "payment-summary":
        return await generatePaymentSummary(orgId, financialYear, employeeId)
      case "payroll-tax":
        return await generatePayrollTaxReport(orgId, financialYear)
      case "super-summary":
        return await generateSuperSummary(orgId, financialYear, quarter)
      case "tax-minimisation":
        return await generateTaxMinimisationReport(orgId)
      default:
        return NextResponse.json(
          { error: "Invalid report type. Options: payment-summary, payroll-tax, super-summary, tax-minimisation" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Individual payment summaries (STP equivalent) for financial year.
 * Aggregates all processed payslips per employee.
 */
async function generatePaymentSummary(
  orgId: string,
  financialYear: string,
  employeeId: string | null
) {
  // Parse FY to date range (e.g., "2025-26" -> 1 Jul 2025 to 30 Jun 2026)
  const [startYear] = financialYear.split("-").map(Number)
  const fyStart = new Date(startYear, 6, 1) // July 1
  const fyEnd = new Date(startYear + 1, 5, 30, 23, 59, 59) // June 30

  const payslipWhere: any = {
    payRun: {
      organizationId: orgId,
      status: "Processed",
      payPeriodEnd: { gte: fyStart, lte: fyEnd },
    },
    status: "Processed",
  }
  if (employeeId) {
    payslipWhere.employeeId = employeeId
  }

  const payslips = await prisma.payslip.findMany({
    where: payslipWhere,
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          taxFileNumber: true,
          startDate: true,
          endDate: true,
        },
      },
      earnings: true,
      deductions: true,
    },
  })

  // Group by employee
  const byEmployee: Record<string, any> = {}
  for (const slip of payslips) {
    const empId = slip.employeeId
    if (!byEmployee[empId]) {
      byEmployee[empId] = {
        employee: slip.employee,
        totalGrossPayments: 0,
        totalTaxWithheld: 0,
        totalSuperContributions: 0,
        totalAllowances: 0,
        totalDeductions: 0,
        payslipCount: 0,
      }
    }
    const summary = byEmployee[empId]
    summary.totalGrossPayments += slip.grossPay || 0
    summary.totalTaxWithheld += slip.taxWithheld || 0
    summary.totalSuperContributions += slip.superContribution || 0
    summary.totalAllowances += (slip.earnings).reduce(
      (sum: number, e: any) => sum + (e.amount || 0), 0
    )
    summary.totalDeductions += (slip.deductions).reduce(
      (sum: number, d: any) => sum + (d.amount || 0), 0
    )
    summary.payslipCount += 1
  }

  // Round all values
  const summaries = Object.values(byEmployee).map((s: any) => ({
    ...s,
    totalGrossPayments: Math.round(s.totalGrossPayments * 100) / 100,
    totalTaxWithheld: Math.round(s.totalTaxWithheld * 100) / 100,
    totalSuperContributions: Math.round(s.totalSuperContributions * 100) / 100,
    totalAllowances: Math.round(s.totalAllowances * 100) / 100,
    totalDeductions: Math.round(s.totalDeductions * 100) / 100,
    netPayments: Math.round((s.totalGrossPayments - s.totalTaxWithheld - s.totalDeductions) * 100) / 100,
  }))

  return NextResponse.json({
    reportType: "payment-summary",
    financialYear,
    generatedAt: new Date().toISOString(),
    employeeSummaries: summaries,
    totals: {
      totalGrossPayments: summaries.reduce((s: number, e: any) => s + e.totalGrossPayments, 0),
      totalTaxWithheld: summaries.reduce((s: number, e: any) => s + e.totalTaxWithheld, 0),
      totalSuperContributions: summaries.reduce((s: number, e: any) => s + e.totalSuperContributions, 0),
      employeeCount: summaries.length,
    },
  })
}

/**
 * State payroll tax liability calculation.
 * Aggregates total wages and applies state thresholds.
 */
async function generatePayrollTaxReport(orgId: string, financialYear: string) {
  const [startYear] = financialYear.split("-").map(Number)
  const fyStart = new Date(startYear, 6, 1)
  const fyEnd = new Date(startYear + 1, 5, 30, 23, 59, 59)

  const payRuns = await prisma.payRun.findMany({
    where: {
      organizationId: orgId,
      status: "Processed",
      payPeriodEnd: { gte: fyStart, lte: fyEnd },
    },
    include: {
      payslips: {
        where: { status: "Processed" },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  })

  const totalWages = payRuns.reduce(
    (sum, pr) => sum + (pr.totalGross || 0),
    0
  )

  // Australian state payroll tax thresholds (using NSW as default)
  const stateThresholds: Record<string, { threshold: number; rate: number; name: string }> = {
    NSW: { threshold: 1200000, rate: 0.0545, name: "New South Wales" },
    VIC: { threshold: 900000, rate: 0.0485, name: "Victoria" },
    QLD: { threshold: 1300000, rate: 0.0475, name: "Queensland" },
    WA: { threshold: 1000000, rate: 0.055, name: "Western Australia" },
    SA: { threshold: 1500000, rate: 0.0495, name: "South Australia" },
    TAS: { threshold: 1250000, rate: 0.0405, name: "Tasmania" },
    ACT: { threshold: 2000000, rate: 0.065, name: "Australian Capital Territory" },
    NT: { threshold: 1500000, rate: 0.055, name: "Northern Territory" },
  }

  const stateCalculations = Object.entries(stateThresholds).map(([code, state]) => {
    const taxableWages = Math.max(0, totalWages - state.threshold)
    const liability = Math.round(taxableWages * state.rate * 100) / 100
    return {
      state: state.name,
      stateCode: code,
      threshold: state.threshold,
      rate: state.rate,
      totalWages: Math.round(totalWages * 100) / 100,
      taxableWages: Math.round(taxableWages * 100) / 100,
      estimatedLiability: liability,
    }
  })

  // Monthly breakdown
  const monthlyBreakdown: Record<string, number> = {}
  for (const pr of payRuns) {
    const month = pr.payPeriodEnd.toISOString().slice(0, 7)
    monthlyBreakdown[month] = (monthlyBreakdown[month] || 0) + (pr.totalGross || 0)
  }

  return NextResponse.json({
    reportType: "payroll-tax",
    financialYear,
    generatedAt: new Date().toISOString(),
    totalWages: Math.round(totalWages * 100) / 100,
    payRunCount: payRuns.length,
    stateCalculations,
    monthlyBreakdown: Object.entries(monthlyBreakdown).map(([month, wages]) => ({
      month,
      wages: Math.round(wages * 100) / 100,
    })),
  })
}

/**
 * Super contributions by employee for a given quarter.
 */
async function generateSuperSummary(
  orgId: string,
  financialYear: string,
  quarter: string | null
) {
  const [startYear] = financialYear.split("-").map(Number)

  // Determine quarter date range
  let qStart: Date
  let qEnd: Date

  if (quarter) {
    const q = parseInt(quarter)
    // FY quarters: Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun
    const quarterMonths = [
      { start: [startYear, 6], end: [startYear, 8] },      // Q1: Jul-Sep
      { start: [startYear, 9], end: [startYear, 11] },      // Q2: Oct-Dec
      { start: [startYear + 1, 0], end: [startYear + 1, 2] }, // Q3: Jan-Mar
      { start: [startYear + 1, 3], end: [startYear + 1, 5] }, // Q4: Apr-Jun
    ]
    const qm = quarterMonths[q - 1] || quarterMonths[0]
    qStart = new Date(qm.start[0], qm.start[1], 1)
    qEnd = new Date(qm.end[0], qm.end[1] + 1, 0, 23, 59, 59)
  } else {
    // Full FY
    qStart = new Date(startYear, 6, 1)
    qEnd = new Date(startYear + 1, 5, 30, 23, 59, 59)
  }

  const payslips = await prisma.payslip.findMany({
    where: {
      status: "Processed",
      payRun: {
        organizationId: orgId,
        status: "Processed",
        payPeriodEnd: { gte: qStart, lte: qEnd },
      },
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          superFundName: true,
          superMemberNumber: true,
          superRate: true,
        },
      },
    },
  })

  // Group by employee
  const byEmployee: Record<string, any> = {}
  for (const slip of payslips) {
    const empId = slip.employeeId
    if (!byEmployee[empId]) {
      byEmployee[empId] = {
        employee: slip.employee,
        ordinaryTimeEarnings: 0,
        superContributions: 0,
        payslipCount: 0,
      }
    }
    byEmployee[empId].ordinaryTimeEarnings += slip.grossPay || 0
    byEmployee[empId].superContributions += slip.superContribution || 0
    byEmployee[empId].payslipCount += 1
  }

  const employeeSummaries = Object.values(byEmployee).map((s: any) => ({
    ...s,
    ordinaryTimeEarnings: Math.round(s.ordinaryTimeEarnings * 100) / 100,
    superContributions: Math.round(s.superContributions * 100) / 100,
    superFund: s.employee.superFundName,
    memberNumber: s.employee.superMemberNumber,
  }))

  const totalOTE = employeeSummaries.reduce(
    (sum: number, e: any) => sum + e.ordinaryTimeEarnings, 0
  )
  const totalSuper = employeeSummaries.reduce(
    (sum: number, e: any) => sum + e.superContributions, 0
  )

  return NextResponse.json({
    reportType: "super-summary",
    financialYear,
    quarter: quarter || "Full Year",
    periodStart: qStart.toISOString(),
    periodEnd: qEnd.toISOString(),
    generatedAt: new Date().toISOString(),
    employeeSummaries,
    totals: {
      totalOrdinaryTimeEarnings: Math.round(totalOTE * 100) / 100,
      totalSuperContributions: Math.round(totalSuper * 100) / 100,
      employeeCount: employeeSummaries.length,
      sgRate: "11.5%",
    },
    dueDate: quarter
      ? getQuarterlyDueDate(parseInt(quarter), startYear)
      : null,
  })
}

/**
 * Super guarantee quarterly due dates
 */
function getQuarterlyDueDate(quarter: number, startYear: number): string {
  const dueDates: Record<number, string> = {
    1: `${startYear}-10-28`,    // Q1 (Jul-Sep) due 28 Oct
    2: `${startYear + 1}-01-28`, // Q2 (Oct-Dec) due 28 Jan
    3: `${startYear + 1}-04-28`, // Q3 (Jan-Mar) due 28 Apr
    4: `${startYear + 1}-07-28`, // Q4 (Apr-Jun) due 28 Jul
  }
  return dueDates[quarter] || ""
}

/**
 * Tax minimisation analysis across all employees.
 */
async function generateTaxMinimisationReport(orgId: string) {
  const employees = await prisma.employee.findMany({
    where: { organizationId: orgId, active: true },
  })

  const existingStrategies = await prisma.taxMinimisationStrategy.findMany({
    where: { organizationId: orgId },
  })

  // Generate suggestions for each employee
  const employeeAnalysis = employees.map((emp: any) => {
    const currentTax = calculatePAYG(emp.annualSalary || 0)
    const suggestions = suggestTaxStrategies(
      {
        annualSalary: emp.annualSalary || 0,
        employmentType: emp.employmentType,
        superRate: emp.superRate || 11.5,
        hasHELPDebt: emp.helpDebt || false,
        hasNovatedLease: false,
      },
      {}
    )

    const existingForEmployee = existingStrategies.filter(
      (s: any) => s.employeeId === emp.id
    )

    const totalSuggestedSavings = suggestions.reduce(
      (sum, s) => sum + s.estimatedAnnualSavings, 0
    )
    const implementedSavings = existingForEmployee
      .filter((s: any) => s.status === "Implemented")
      .reduce((sum: number, s: any) => sum + (s.actualSavings || s.estimatedSavings || 0), 0)

    return {
      employee: {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeNumber: emp.employeeNumber,
        annualSalary: emp.annualSalary,
      },
      currentAnnualTax: currentTax.totalTax,
      suggestedStrategies: suggestions,
      existingStrategies: existingForEmployee,
      totalSuggestedSavings: Math.round(totalSuggestedSavings * 100) / 100,
      implementedSavings: Math.round(implementedSavings * 100) / 100,
    }
  })

  const totalPotentialSavings = employeeAnalysis.reduce(
    (sum, e) => sum + e.totalSuggestedSavings, 0
  )
  const totalImplementedSavings = employeeAnalysis.reduce(
    (sum, e) => sum + e.implementedSavings, 0
  )

  return NextResponse.json({
    reportType: "tax-minimisation",
    generatedAt: new Date().toISOString(),
    employeeAnalysis,
    summary: {
      totalEmployees: employees.length,
      totalPotentialSavings: Math.round(totalPotentialSavings * 100) / 100,
      totalImplementedSavings: Math.round(totalImplementedSavings * 100) / 100,
      unrealisedSavings: Math.round((totalPotentialSavings - totalImplementedSavings) * 100) / 100,
      totalExistingStrategies: existingStrategies.length,
      implementedCount: existingStrategies.filter((s: any) => s.status === "Implemented").length,
    },
  })
}
