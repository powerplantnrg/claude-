import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface AgingBuckets {
  current: number
  days1to30: number
  days31to60: number
  days61to90: number
  days90plus: number
  total: number
}

interface ContactAgingRow extends AgingBuckets {
  contactId: string
  contactName: string
  itemCount: number
}

function calculateDaysOverdue(dueDate: Date, today: Date): number {
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffMs = now.getTime() - due.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  if (type !== "receivables" && type !== "payables") {
    return NextResponse.json(
      { error: "Invalid type parameter. Use ?type=receivables or ?type=payables" },
      { status: 400 }
    )
  }

  const today = new Date()

  if (type === "receivables") {
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["SENT", "OVERDUE", "Sent", "Overdue"] },
      },
      include: { contact: true },
      orderBy: { dueDate: "asc" },
    })

    const { contactRows, totals, summary } = buildAgingData(invoices, today, "invoices")
    return NextResponse.json({ type: "receivables", contacts: contactRows, totals, summary })
  } else {
    const bills = await prisma.bill.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["RECEIVED", "OVERDUE", "Received", "Overdue"] },
      },
      include: { contact: true },
      orderBy: { dueDate: "asc" },
    })

    const { contactRows, totals, summary } = buildAgingData(bills, today, "bills")
    return NextResponse.json({ type: "payables", contacts: contactRows, totals, summary })
  }
}

function buildAgingData(
  items: Array<{ contactId: string; contact: { name: string }; dueDate: Date; total: number }>,
  today: Date,
  itemType: "invoices" | "bills"
) {
  const contactMap = new Map<string, ContactAgingRow>()

  for (const item of items) {
    const daysOverdue = calculateDaysOverdue(item.dueDate, today)

    if (!contactMap.has(item.contactId)) {
      contactMap.set(item.contactId, {
        contactId: item.contactId,
        contactName: item.contact.name,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
        total: 0,
        itemCount: 0,
      })
    }

    const entry = contactMap.get(item.contactId)!
    entry.itemCount++
    entry.total += item.total

    if (daysOverdue <= 0) {
      entry.current += item.total
    } else if (daysOverdue <= 30) {
      entry.days1to30 += item.total
    } else if (daysOverdue <= 60) {
      entry.days31to60 += item.total
    } else if (daysOverdue <= 90) {
      entry.days61to90 += item.total
    } else {
      entry.days90plus += item.total
    }
  }

  const contactRows = Array.from(contactMap.values()).sort((a, b) => b.total - a.total)

  const totals: AgingBuckets = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0 }
  for (const row of contactRows) {
    totals.current += row.current
    totals.days1to30 += row.days1to30
    totals.days31to60 += row.days31to60
    totals.days61to90 += row.days61to90
    totals.days90plus += row.days90plus
    totals.total += row.total
  }

  const totalOverdue = totals.days1to30 + totals.days31to60 + totals.days61to90 + totals.days90plus
  const overdueContacts = contactRows.filter(
    (r) => r.days1to30 > 0 || r.days31to60 > 0 || r.days61to90 > 0 || r.days90plus > 0
  ).length

  let totalWeightedDays = 0
  let totalAmount = 0
  for (const item of items) {
    const daysOverdue = calculateDaysOverdue(item.dueDate, today)
    totalWeightedDays += Math.max(0, daysOverdue) * item.total
    totalAmount += item.total
  }
  const avgDaysOutstanding = totalAmount > 0 ? Math.round(totalWeightedDays / totalAmount) : 0

  return {
    contactRows,
    totals,
    summary: {
      totalOutstanding: totals.total,
      totalOverdue,
      avgDaysOutstanding,
      overdueContacts,
      totalItems: items.length,
      itemType,
    },
  }
}
