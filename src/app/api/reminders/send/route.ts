import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const now = new Date()

    // Find all due reminders that haven't been sent
    const dueReminders = await prisma.paymentReminder.findMany({
      where: {
        organizationId: orgId,
        status: "Scheduled",
        scheduledDate: { lte: now },
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            total: true,
            dueDate: true,
            status: true,
            contact: { select: { name: true, email: true } },
          },
        },
      },
    })

    let sentCount = 0
    let skippedCount = 0

    for (const reminder of dueReminders) {
      // Skip if invoice is already paid
      if (reminder.invoice?.status === "Paid") {
        await prisma.paymentReminder.update({
          where: { id: reminder.id },
          data: { status: "Skipped" },
        })
        skippedCount++
        continue
      }

      // In a real system, this would send an email
      // For now, mark as sent
      await prisma.paymentReminder.update({
        where: { id: reminder.id },
        data: {
          status: "Sent",
          sentAt: now,
        },
      })
      sentCount++
    }

    return NextResponse.json({
      message: `Processed ${dueReminders.length} reminders: ${sentCount} sent, ${skippedCount} skipped`,
      sentCount,
      skippedCount,
      totalProcessed: dueReminders.length,
    })
  } catch (error) {
    console.error("Error sending reminders:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
