import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface Notification {
  id: string
  type: "overdue_invoice" | "compliance_warning" | "budget_alert" | "grant_deadline"
  title: string
  message: string
  severity: "info" | "warning" | "critical"
  link: string
  createdAt: string
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string
  const now = new Date()
  const notifications: Notification[] = []

  // 1. Overdue invoices (past due date and not paid)
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      dueDate: { lt: now },
      status: { notIn: ["Paid", "Voided"] },
    },
    include: { contact: true },
    orderBy: { dueDate: "asc" },
  })

  for (const inv of overdueInvoices) {
    const daysOverdue = Math.floor(
      (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    notifications.push({
      id: `inv-${inv.id}`,
      type: "overdue_invoice",
      title: `Invoice ${inv.invoiceNumber} overdue`,
      message: `${inv.contact.name} - $${inv.total.toFixed(2)} is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`,
      severity: daysOverdue > 30 ? "critical" : "warning",
      link: `/invoices`,
      createdAt: inv.dueDate.toISOString(),
    })
  }

  // 2. R&D compliance warnings (projects with incomplete checklists)
  const projectsWithChecklists = await prisma.rdProject.findMany({
    where: {
      organizationId: orgId,
      status: "Active",
    },
    include: {
      complianceChecklist: true,
    },
  })

  for (const proj of projectsWithChecklists) {
    if (proj.complianceChecklist.length === 0) continue
    const total = proj.complianceChecklist.length
    const completed = proj.complianceChecklist.filter((c) => c.completed).length
    const completionRate = completed / total

    if (completionRate < 1) {
      notifications.push({
        id: `comp-${proj.id}`,
        type: "compliance_warning",
        title: `Compliance incomplete: ${proj.name}`,
        message: `${completed}/${total} checklist items completed (${Math.round(completionRate * 100)}%)`,
        severity: completionRate < 0.5 ? "critical" : "warning",
        link: `/rd/compliance`,
        createdAt: now.toISOString(),
      })
    }
  }

  // 3. Budget alerts (R&D projects where actual spend > 80% of budget)
  const projectsWithExpenses = await prisma.rdProject.findMany({
    where: {
      organizationId: orgId,
      status: "Active",
      budget: { not: null, gt: 0 },
    },
    include: {
      rdExpenses: {
        include: { journalLine: true },
      },
      activities: {
        include: { timeEntries: true },
      },
      portfolioEntry: true,
    },
  })

  for (const proj of projectsWithExpenses) {
    const budget = proj.budget!
    const expenseSpend = proj.rdExpenses.reduce(
      (sum, exp) => sum + (exp.journalLine.debit || 0),
      0
    )
    const timeSpend = proj.activities.reduce((actSum, act) => {
      return (
        actSum +
        act.timeEntries.reduce(
          (teSum, te) => teSum + te.hours * (te.hourlyRate || 0),
          0
        )
      )
    }, 0)
    const actualSpend = proj.portfolioEntry?.actualSpend ?? expenseSpend + timeSpend
    const burnRate = (actualSpend / budget) * 100

    if (burnRate >= 80) {
      notifications.push({
        id: `budget-${proj.id}`,
        type: "budget_alert",
        title: `Budget alert: ${proj.name}`,
        message: `${Math.round(burnRate)}% of budget consumed ($${actualSpend.toFixed(2)} / $${budget.toFixed(2)})`,
        severity: burnRate >= 100 ? "critical" : "warning",
        link: `/rd/portfolio`,
        createdAt: now.toISOString(),
      })
    }
  }

  // 4. Upcoming grant deadlines (milestones due within 14 days)
  const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const upcomingMilestones = await prisma.grantMilestone.findMany({
    where: {
      completed: false,
      dueDate: {
        gte: now,
        lte: fourteenDaysFromNow,
      },
      grant: {
        organizationId: orgId,
      },
    },
    include: {
      grant: true,
    },
    orderBy: { dueDate: "asc" },
  })

  for (const ms of upcomingMilestones) {
    if (!ms.dueDate) continue
    const daysUntil = Math.ceil(
      (ms.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    notifications.push({
      id: `grant-${ms.id}`,
      type: "grant_deadline",
      title: `Grant milestone due: ${ms.title}`,
      message: `${ms.grant.name} - due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
      severity: daysUntil <= 3 ? "critical" : daysUntil <= 7 ? "warning" : "info",
      link: `/grants`,
      createdAt: ms.dueDate.toISOString(),
    })
  }

  // Sort by severity (critical first), then by date
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }
  notifications.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  )

  return NextResponse.json({
    notifications,
    count: notifications.length,
  })
}
