import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  const [invoicesDueThisWeek, billsDueThisWeek, unreconciledTransactions, openExperiments] =
    await Promise.all([
      prisma.invoice.count({
        where: {
          organizationId: orgId,
          status: { notIn: ["Paid", "Void"] },
          dueDate: { gte: startOfWeek, lte: endOfWeek },
        },
      }),
      prisma.bill.count({
        where: {
          organizationId: orgId,
          status: { notIn: ["Paid", "Void"] },
          dueDate: { gte: startOfWeek, lte: endOfWeek },
        },
      }),
      prisma.bankTransaction.count({
        where: {
          organizationId: orgId,
          reconciled: false,
        },
      }),
      prisma.experiment.count({
        where: {
          rdActivity: {
            rdProject: { organizationId: orgId },
          },
          status: { in: ["Planned", "InProgress", "Running"] },
        },
      }),
    ])

  return NextResponse.json({
    invoicesDueThisWeek,
    billsDueThisWeek,
    unreconciledTransactions,
    openExperiments,
  })
}
