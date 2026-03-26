import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const SAMPLE_DESCRIPTIONS = [
  "Direct Debit - Office Supplies Co",
  "Transfer from Customer Acct",
  "AWS Cloud Services",
  "Salary Payment - Engineering",
  "Equipment Purchase - Lab",
  "Consulting Fee Received",
  "Insurance Premium",
  "Subscription - SaaS Tool",
  "Client Payment - Project Alpha",
  "Rent Payment - Office",
  "Utility Bill - Electricity",
  "Research Materials Purchase",
  "Conference Registration Fee",
  "Travel Expense - Client Visit",
  "Software License Renewal",
]

const SAMPLE_CATEGORIES = [
  "Office Expenses",
  "Revenue",
  "Cloud & IT",
  "Payroll",
  "Equipment",
  "Consulting",
  "Insurance",
  "Subscriptions",
  "Revenue",
  "Rent",
  "Utilities",
  "R&D Materials",
  "Training",
  "Travel",
  "Software",
]

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const feed = await prisma.bankFeed.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!feed) {
      return NextResponse.json(
        { error: "Bank feed not found" },
        { status: 404 }
      )
    }

    if (feed.status !== "Active") {
      return NextResponse.json(
        { error: "Bank feed is not active. Resume or reconnect first." },
        { status: 400 }
      )
    }

    // Generate 5-10 sample transactions for demo
    const count = Math.floor(Math.random() * 6) + 5
    const transactions = []

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * SAMPLE_DESCRIPTIONS.length)
      const isDebit = Math.random() > 0.4
      const amount = isDebit
        ? -(Math.floor(Math.random() * 500000) / 100 + 10)
        : Math.floor(Math.random() * 1000000) / 100 + 50

      const daysAgo = Math.floor(Math.random() * 30)
      const date = new Date()
      date.setDate(date.getDate() - daysAgo)

      const transaction = await prisma.bankFeedTransaction.create({
        data: {
          bankFeedId: id,
          externalId: `SYNC-${Date.now()}-${i}`,
          date,
          amount,
          description: SAMPLE_DESCRIPTIONS[idx],
          reference: `REF-${Math.floor(Math.random() * 900000) + 100000}`,
          category: SAMPLE_CATEGORIES[idx],
          status: "Pending",
        },
      })
      transactions.push(transaction)
    }

    // Update feed last sync timestamp
    await prisma.bankFeed.update({
      where: { id },
      data: { lastSyncAt: new Date() },
    })

    return NextResponse.json({
      synced: transactions.length,
      transactions,
      lastSyncAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error syncing bank feed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
