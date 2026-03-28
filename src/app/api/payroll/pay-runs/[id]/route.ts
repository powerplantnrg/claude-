import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePAYG, calculateSuperannuation } from "@/lib/payroll-tax"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const payRun = await prisma.payRun.findFirst({
      where: { id, organizationId: orgId },
      include: {
        payslips: {
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            earnings: true,
            deductions: true,
            leave: true,
          },
        },
      },
    })

    if (!payRun) {
      return NextResponse.json({ error: "Pay run not found" }, { status: 404 })
    }

    return NextResponse.json(payRun)
  } catch (error) {
    console.error("Error fetching pay run:", error)
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id as string
    const { id } = await params

    const payRun = await prisma.payRun.findFirst({
      where: { id, organizationId: orgId },
      include: {
        payslips: {
          include: {
            employee: true,
            earnings: true,
            deductions: true,
          },
        },
      },
    })

    if (!payRun) {
      return NextResponse.json({ error: "Pay run not found" }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body // "process" or "void"

    if (action === "process") {
      if (payRun.status !== "Draft") {
        return NextResponse.json(
          { error: "Only draft pay runs can be processed" },
          { status: 400 }
        )
      }

      // Recalculate tax, super, and deductions for each payslip
      const frequencyFactors: Record<string, number> = {
        Weekly: 52,
        Fortnightly: 26,
        Monthly: 12,
      }
      // Determine pay frequency from first employee or default
      const firstEmp = payRun.payslips[0]?.employee
      const payFreq = firstEmp?.payFrequency || "Fortnightly"
      const factor = frequencyFactors[payFreq] || 26

      let totalGross = 0
      let totalTax = 0
      let totalSuper = 0
      let totalNet = 0

      for (const payslip of payRun.payslips) {
        const emp = payslip.employee

        // Sum additional earnings
        const additionalEarnings = (payslip.earnings || []).reduce(
          (sum: number, e: any) => sum + (e.amount || 0),
          0
        )

        // Sum deductions (employee-side)
        const totalDeductions = (payslip.deductions || []).reduce(
          (sum: number, d: any) => sum + (d.amount || 0),
          0
        )

        const gross = payslip.grossPay + additionalEarnings
        const annualised = gross * factor

        const residency = (emp.residencyStatus || "resident") as "resident" | "foreign" | "working-holiday"
        const annualTax = calculatePAYG(
          annualised,
          residency,
          emp.taxFreeThreshold !== false,
          emp.helpDebt || false,
          emp.sfssDebt || false,
          emp.medicareLevyExemption !== "None"
        )

        const periodTax = Math.round((annualTax.totalTax / factor) * 100) / 100
        const superAmount = calculateSuperannuation(gross, (emp.superRate || 11.5) / 100)
        const netPay = Math.round((gross - periodTax - totalDeductions) * 100) / 100

        await prisma.payslip.update({
          where: { id: payslip.id },
          data: {
            grossPay: Math.round(gross * 100) / 100,
            taxWithheld: periodTax,
            superContribution: superAmount,
            netPay,
            status: "Processed",
          },
        })

        totalGross += gross
        totalTax += periodTax
        totalSuper += superAmount
        totalNet += netPay
      }

      const updated = await prisma.payRun.update({
        where: { id },
        data: {
          status: "Processed",
          totalGross: Math.round(totalGross * 100) / 100,
          totalTax: Math.round(totalTax * 100) / 100,
          totalSuper: Math.round(totalSuper * 100) / 100,
          totalNet: Math.round(totalNet * 100) / 100,
          processedAt: new Date(),
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
          action: "Process",
          entityType: "PayRun",
          entityId: id,
          details: `Processed pay run ${payRun.id} - ${payRun.payslips.length} payslips, total gross $${totalGross.toFixed(2)}`,
          organizationId: orgId,
        },
      })

      return NextResponse.json(updated)
    }

    if (action === "void") {
      if (payRun.status === "Voided") {
        return NextResponse.json(
          { error: "Pay run is already voided" },
          { status: 400 }
        )
      }

      // Void all payslips
      await prisma.payslip.updateMany({
        where: { payRunId: id },
        data: { status: "Voided" },
      })

      const updated = await prisma.payRun.update({
        where: { id },
        data: { status: "Voided" },
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
          action: "Void",
          entityType: "PayRun",
          entityId: id,
          details: `Voided pay run ${payRun.id}`,
          organizationId: orgId,
        },
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Invalid action. Use 'process' or 'void'" }, { status: 400 })
  } catch (error) {
    console.error("Error updating pay run:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
