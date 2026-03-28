import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  startDate: Date,
  monthlyPayment: number
) {
  const schedule = []
  let balance = principal
  const monthlyRate = annualRate / 100 / 12

  for (let i = 1; i <= termMonths; i++) {
    const interestAmount = balance * monthlyRate
    const principalAmount = monthlyPayment - interestAmount
    balance = Math.max(0, balance - principalAmount)

    const paymentDate = new Date(startDate)
    paymentDate.setMonth(paymentDate.getMonth() + i)

    schedule.push({
      period: i,
      date: paymentDate.toISOString(),
      payment: Math.round(monthlyPayment * 100) / 100,
      principal: Math.round(principalAmount * 100) / 100,
      interest: Math.round(interestAmount * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    })
  }

  return schedule
}

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

    const loan = await prisma.loan.findFirst({
      where: { id, organizationId: orgId },
      include: {
        liabilityAccount: { select: { id: true, name: true, code: true } },
        interestExpenseAccount: { select: { id: true, name: true, code: true } },
        payments: {
          orderBy: { date: "desc" },
        },
      },
    })

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    const amortizationSchedule = generateAmortizationSchedule(
      loan.principalAmount,
      loan.interestRate,
      loan.termMonths,
      loan.startDate,
      loan.monthlyPayment ?? 0
    )

    return NextResponse.json({
      ...loan,
      amortizationSchedule,
    })
  } catch (error) {
    console.error("Error fetching loan:", error)
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
    const { id } = await params

    const loan = await prisma.loan.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.lender !== undefined) updateData.lender = body.lender
    if (body.status !== undefined) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.interestRate !== undefined) {
      updateData.interestRate = parseFloat(body.interestRate)
    }
    if (body.liabilityAccountId !== undefined) updateData.liabilityAccountId = body.liabilityAccountId
    if (body.interestExpenseAccountId !== undefined) updateData.interestExpenseAccountId = body.interestExpenseAccountId

    const updated = await prisma.loan.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating loan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const loan = await prisma.loan.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    await prisma.loan.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting loan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
