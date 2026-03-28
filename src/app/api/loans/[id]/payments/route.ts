import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
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

    if (loan.status !== "Active") {
      return NextResponse.json(
        { error: "Can only record payments for active loans" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { date, principalAmount, interestAmount, notes } = body

    if (!date || principalAmount === undefined || interestAmount === undefined) {
      return NextResponse.json(
        { error: "Date, principal amount, and interest amount are required" },
        { status: 400 }
      )
    }

    const principalPaid = parseFloat(principalAmount)
    const interestPaid = parseFloat(interestAmount)
    const totalAmount = principalPaid + interestPaid
    const newBalance = Math.max(0, (loan.currentBalance ?? 0) - principalPaid)

    // Create journal entry if accounts are configured
    let journalEntryId: string | null = null
    if (loan.liabilityAccountId && loan.interestExpenseAccountId) {
      const entryCount = await prisma.journalEntry.count({
        where: { organizationId: orgId },
      })
      const entryNumber = entryCount + 1

      const journalEntry = await prisma.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(date),
          narration: `Loan payment - ${loan.name}`,
          status: "Posted",
          organizationId: orgId,
          lines: {
            create: [
              {
                accountId: loan.liabilityAccountId,
                description: `Principal payment - ${loan.name}`,
                debit: principalPaid,
                credit: 0,
              },
              {
                accountId: loan.interestExpenseAccountId,
                description: `Interest payment - ${loan.name}`,
                debit: interestPaid,
                credit: 0,
              },
              // Credit will be to cash/bank - using liability account as placeholder
              {
                accountId: loan.liabilityAccountId,
                description: `Loan payment from bank - ${loan.name}`,
                debit: 0,
                credit: totalAmount,
              },
            ],
          },
        },
      })
      journalEntryId = journalEntry.id
    }

    // Create loan payment record
    const payment = await prisma.loanPayment.create({
      data: {
        loanId: id,
        date: new Date(date),
        principalAmount: principalPaid,
        interestAmount: interestPaid,
        totalAmount,
        balance: newBalance,
        journalEntryId,
        notes: notes || null,
      },
    })

    // Update loan balance
    const updateData: Record<string, unknown> = { currentBalance: newBalance }
    if (newBalance === 0) {
      updateData.status = "Paid Off"
    }

    await prisma.loan.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error("Error recording loan payment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
