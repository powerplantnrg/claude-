import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function getNextDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate)
  switch (frequency) {
    case "Weekly":
      next.setDate(next.getDate() + 7)
      break
    case "Fortnightly":
      next.setDate(next.getDate() + 14)
      break
    case "Monthly":
      next.setMonth(next.getMonth() + 1)
      break
    case "Quarterly":
      next.setMonth(next.getMonth() + 3)
      break
    case "Annually":
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      next.setMonth(next.getMonth() + 1)
  }
  return next
}

export async function POST() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const now = new Date()

    // Find all active recurring bills where nextDate is due
    const dueBills = await prisma.recurringBill.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        nextDate: { lte: now },
      },
      include: {
        contact: { select: { id: true, name: true } },
      },
    })

    let generatedCount = 0
    const generatedBills: string[] = []

    for (const recurring of dueBills) {
      // Check if past end date
      if (recurring.endDate && recurring.nextDate > recurring.endDate) {
        await prisma.recurringBill.update({
          where: { id: recurring.id },
          data: { isActive: false },
        })
        continue
      }

      // Generate a bill
      const billCount = await prisma.bill.count({
        where: { organizationId: orgId },
      })
      const billNumber = `BILL-${String(billCount + 1).padStart(4, "0")}`

      const dueDate = new Date(recurring.nextDate)
      dueDate.setDate(dueDate.getDate() + 30) // Default 30 day payment terms

      await prisma.bill.create({
        data: {
          billNumber,
          contactId: recurring.contactId,
          date: recurring.nextDate,
          dueDate,
          status: "Draft",
          subtotal: recurring.amount ?? 0,
          taxTotal: recurring.taxAmount ?? 0,
          total: recurring.totalAmount ?? 0,
          notes: recurring.notes
            ? `Auto-generated from recurring bill. ${recurring.notes}`
            : "Auto-generated from recurring bill.",
          organizationId: orgId,
          lines: {
            create: [
              {
                description: recurring.description || "Recurring bill",
                quantity: 1,
                unitPrice: recurring.amount ?? 0,
                amount: recurring.amount ?? 0,
                accountId: recurring.accountId!,
                taxType: (recurring.taxAmount ?? 0) > 0 ? "GST" : null,
              },
            ],
          },
        },
      })

      // Update recurring bill
      const nextDate = getNextDate(recurring.nextDate, recurring.frequency)
      await prisma.recurringBill.update({
        where: { id: recurring.id },
        data: {
          lastGeneratedDate: now,
          nextDate,
          generatedCount: (recurring.generatedCount ?? 0) + 1,
        },
      })

      generatedCount++
      generatedBills.push(billNumber)
    }

    return NextResponse.json({
      message: `Generated ${generatedCount} bills`,
      generatedCount,
      billNumbers: generatedBills,
    })
  } catch (error) {
    console.error("Error generating recurring bills:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
