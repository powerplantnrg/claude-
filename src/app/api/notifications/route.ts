import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface Notification {
  id: string
  type:
    | "overdue_invoice"
    | "compliance_warning"
    | "budget_alert"
    | "grant_deadline"
    | "pending_approval"
    | "marketplace_bid"
    | "contract_milestone"
    | "leave_request"
    | "migration_review"
    | "inventory_reorder"
    | "time_entry_approval"
    | "payroll_due"
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

  // 5. Pending approval requests
  const pendingApprovals = await prisma.approvalRequest.findMany({
    where: {
      organizationId: orgId,
      status: "Pending",
    },
    include: { workflow: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  for (const req of pendingApprovals) {
    notifications.push({
      id: `approval-${req.id}`,
      type: "pending_approval",
      title: `Approval pending: ${req.workflow.name}`,
      message: `${req.entityType} requires approval`,
      severity: "warning",
      link: `/approvals`,
      createdAt: req.createdAt.toISOString(),
    })
  }

  // 6. New marketplace bids received
  const newBids = await prisma.marketplaceBid.findMany({
    where: {
      listing: {
        organizationId: orgId,
      },
      status: "Submitted",
    },
    include: {
      listing: true,
    },
    orderBy: { submittedAt: "desc" },
    take: 10,
  })

  for (const bid of newBids) {
    notifications.push({
      id: `bid-${bid.id}`,
      type: "marketplace_bid",
      title: `New bid on: ${bid.listing.title}`,
      message: `Bid amount: $${bid.amount.toFixed(2)}`,
      severity: "info",
      link: `/marketplace/listings/${bid.listingId}`,
      createdAt: bid.submittedAt.toISOString(),
    })
  }

  // 7. Contract milestones due soon (within 7 days)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingContractMilestones = await prisma.contractMilestone.findMany({
    where: {
      status: { not: "Completed" },
      dueDate: {
        gte: now,
        lte: sevenDaysFromNow,
      },
      contract: {
        listing: {
          organizationId: orgId,
        },
      },
    },
    include: { contract: true },
    orderBy: { dueDate: "asc" },
  })

  for (const cm of upcomingContractMilestones) {
    if (!cm.dueDate) continue
    const daysUntil = Math.ceil(
      (cm.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    notifications.push({
      id: `cmilestone-${cm.id}`,
      type: "contract_milestone",
      title: `Contract milestone due: ${cm.name}`,
      message: `Due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
      severity: daysUntil <= 2 ? "critical" : "warning",
      link: `/marketplace/contracts/${cm.contractId}`,
      createdAt: cm.dueDate.toISOString(),
    })
  }

  // 8. Leave requests pending approval
  const pendingLeave = await prisma.leaveRequest.findMany({
    where: {
      organizationId: orgId,
      status: "Pending",
    },
    include: { employee: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  for (const lr of pendingLeave) {
    notifications.push({
      id: `leave-${lr.id}`,
      type: "leave_request",
      title: `Leave request: ${lr.employee.firstName} ${lr.employee.lastName}`,
      message: `${lr.type} from ${lr.startDate.toLocaleDateString()} to ${lr.endDate.toLocaleDateString()}`,
      severity: "info",
      link: `/payroll/leave`,
      createdAt: lr.createdAt.toISOString(),
    })
  }

  // 9. Migration jobs requiring review
  const migrationJobs = await prisma.migrationJob.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["PendingReview", "Failed"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  })

  for (const mj of migrationJobs) {
    notifications.push({
      id: `migration-${mj.id}`,
      type: "migration_review",
      title: `Migration: ${mj.name}`,
      message: `Status: ${mj.status} - requires review`,
      severity: mj.status === "Failed" ? "critical" : "warning",
      link: `/migration/jobs/${mj.id}`,
      createdAt: mj.updatedAt.toISOString(),
    })
  }

  // 10. Inventory items below reorder level
  const lowStockItems = await prisma.inventoryItem.findMany({
    where: {
      organizationId: orgId,
      reorderLevel: { gt: 0 },
    },
  })

  for (const item of lowStockItems) {
    if (item.reorderLevel && item.quantityOnHand <= item.reorderLevel) {
      notifications.push({
        id: `inventory-${item.id}`,
        type: "inventory_reorder",
        title: `Low stock: ${item.name}`,
        message: `${item.quantityOnHand} remaining (reorder level: ${item.reorderLevel})`,
        severity: item.quantityOnHand === 0 ? "critical" : "warning",
        link: `/inventory/items/${item.id}`,
        createdAt: now.toISOString(),
      })
    }
  }

  // 11. Time entries pending approval
  const pendingTimeEntries = await prisma.timeEntry.findMany({
    where: {
      organizationId: orgId,
      approvalStatus: "Pending",
    },
    include: { project: true },
    orderBy: { date: "desc" },
    take: 10,
  })

  if (pendingTimeEntries.length > 0) {
    notifications.push({
      id: `time-entries-pending`,
      type: "time_entry_approval",
      title: `Time entries awaiting approval`,
      message: `${pendingTimeEntries.length} time entr${pendingTimeEntries.length === 1 ? "y" : "ies"} pending review`,
      severity: "info",
      link: `/time-tracking`,
      createdAt: now.toISOString(),
    })
  }

  // 12. Payroll due (upcoming pay runs within 7 days)
  const upcomingPayRuns = await prisma.payRun.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["Draft", "Pending"] },
      payDate: {
        gte: now,
        lte: sevenDaysFromNow,
      },
    },
    orderBy: { payDate: "asc" },
  })

  for (const pr of upcomingPayRuns) {
    const daysUntil = Math.ceil(
      (pr.payDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    notifications.push({
      id: `payrun-${pr.id}`,
      type: "payroll_due",
      title: `Pay run due: ${pr.payDate.toLocaleDateString()}`,
      message: `${pr.status} - due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
      severity: daysUntil <= 1 ? "critical" : daysUntil <= 3 ? "warning" : "info",
      link: `/payroll/pay-runs`,
      createdAt: pr.payDate.toISOString(),
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
