import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    // Fetch active employees with their latest payslip data
    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId, active: true },
      include: {
        payslips: {
          orderBy: { createdAt: "desc" },
          take: 12, // last 12 payslips for YTD calculation
        },
      },
    })

    if (employees.length === 0) {
      return NextResponse.json(
        { error: "No active employees found for STP filing" },
        { status: 400 }
      )
    }

    // Build STP summary report
    const employeeSummaries = employees.map((emp) => {
      const ytdGross = emp.payslips.reduce(
        (sum, p) => sum + (p.grossPay ?? 0),
        0
      )
      const ytdTax = emp.payslips.reduce(
        (sum, p) => sum + (p.taxWithheld ?? 0),
        0
      )
      const ytdSuper = emp.payslips.reduce(
        (sum, p) => sum + (p.superAmount ?? 0),
        0
      )

      return {
        employeeId: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        employmentType: emp.employmentType,
        taxFileNumber: emp.taxFileNumber
          ? `***-***-${emp.taxFileNumber.slice(-3)}`
          : "Not provided",
        ytdGrossPay: Math.round(ytdGross * 100) / 100,
        ytdTaxWithheld: Math.round(ytdTax * 100) / 100,
        ytdSuperannuation: Math.round(ytdSuper * 100) / 100,
        ytdNetPay:
          Math.round((ytdGross - ytdTax) * 100) / 100,
        payslipCount: emp.payslips.length,
      }
    })

    const totals = {
      totalEmployees: employees.length,
      totalGrossPay: employeeSummaries.reduce(
        (sum, e) => sum + e.ytdGrossPay,
        0
      ),
      totalTaxWithheld: employeeSummaries.reduce(
        (sum, e) => sum + e.ytdTaxWithheld,
        0
      ),
      totalSuperannuation: employeeSummaries.reduce(
        (sum, e) => sum + e.ytdSuperannuation,
        0
      ),
      totalNetPay: employeeSummaries.reduce(
        (sum, e) => sum + e.ytdNetPay,
        0
      ),
    }

    // Simulate filing with ATO
    const filingId = `STP-${Date.now()}`
    const filingDate = new Date().toISOString()

    const report = {
      filingId,
      filingDate,
      status: "Lodged",
      filingType: "STP Phase 2",
      paymentPeriod: `FY ${new Date().getFullYear()}`,
      organizationId: orgId,
      employees: employeeSummaries,
      totals,
      atoResponse: {
        status: "Accepted",
        receiptNumber: `ATO-${Math.floor(Math.random() * 9000000) + 1000000}`,
        lodgementDate: filingDate,
        message:
          "STP filing has been successfully lodged with the Australian Taxation Office (simulated).",
      },
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("Error processing STP filing:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
