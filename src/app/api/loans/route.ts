import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const loans = await prisma.loan.findMany({
      where: { organizationId: orgId },
      include: {
        liabilityAccount: { select: { name: true } },
        interestExpenseAccount: { select: { name: true } },
        payments: {
          orderBy: { date: "desc" },
          take: 1,
        },
      },
      orderBy: { startDate: "desc" },
    })

    // Calculate summary stats
    const totalDebt = loans.reduce((sum, l) => sum + (l.currentBalance ?? 0), 0)
    const monthlyPayments = loans
      .filter((l) => l.status === "Active")
      .reduce((sum, l) => sum + (l.monthlyPayment ?? 0), 0)

    // Find next payment due: closest future maturity or next month
    const now = new Date()
    const activeLoans = loans.filter((l) => l.status === "Active")
    let nextPaymentDue: string | null = null
    if (activeLoans.length > 0) {
      // Simple heuristic: next month from today
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      nextPaymentDue = next.toISOString()
    }

    return NextResponse.json({
      loans,
      summary: {
        totalDebt,
        monthlyPayments,
        nextPaymentDue,
        loanCount: loans.length,
        activeCount: activeLoans.length,
      },
    })
  } catch (error) {
    console.error("Error fetching loans:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const {
      name,
      lender,
      lenderContactId,
      loanType,
      principalAmount,
      interestRate,
      interestType,
      termMonths,
      startDate,
      maturityDate,
      liabilityAccountId,
      interestExpenseAccountId,
      notes,
    } = body

    if (!name || !principalAmount || !interestRate || !termMonths || !startDate) {
      return NextResponse.json(
        { error: "Name, principal amount, interest rate, term, and start date are required" },
        { status: 400 }
      )
    }

    // Calculate monthly payment (standard amortization formula)
    const principal = parseFloat(principalAmount)
    const annualRate = parseFloat(interestRate) / 100
    const months = parseInt(termMonths)
    let monthlyPayment = 0

    if (annualRate > 0) {
      const monthlyRate = annualRate / 12
      monthlyPayment =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1)
    } else {
      monthlyPayment = principal / months
    }

    // Calculate maturity date if not provided
    const start = new Date(startDate)
    const calculatedMaturity =
      maturityDate
        ? new Date(maturityDate)
        : new Date(start.getFullYear(), start.getMonth() + months, start.getDate())

    const loan = await prisma.loan.create({
      data: {
        name,
        lender: lender || null,
        lenderContactId: lenderContactId || null,
        loanType: loanType || "Term Loan",
        principalAmount: principal,
        interestRate: parseFloat(interestRate),
        interestType: interestType || "Fixed",
        termMonths: months,
        startDate: start,
        maturityDate: calculatedMaturity,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        currentBalance: principal,
        liabilityAccountId: liabilityAccountId || null,
        interestExpenseAccountId: interestExpenseAccountId || null,
        status: "Active",
        notes: notes || null,
        organizationId: orgId,
      },
    })

    return NextResponse.json(loan, { status: 201 })
  } catch (error) {
    console.error("Error creating loan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
