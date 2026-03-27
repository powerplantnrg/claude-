import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import dynamic from "next/dynamic"

const RevenueExpensesChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((m) => ({ default: m.RevenueExpensesChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-xl" /> }
)
const CashFlowChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((m) => ({ default: m.CashFlowChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-xl" /> }
)
const RdSpendByCategoryChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((m) => ({ default: m.RdSpendByCategoryChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-xl" /> }
)
import { SparklineCard } from "@/components/dashboard/sparkline-cards"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist"
import { QuickStats } from "@/components/dashboard/quick-stats"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const [
    revenueResult,
    expenseResult,
    outstandingInvoices,
    activeRdProjects,
    recentEntries,
    rdClaimEstimate,
    monthlyJournalLines,
    rdExpensesByCategory,
    // New module queries
    employeeCount,
    latestPayRun,
    taxSavings,
    pendingLeave,
    activeProjects,
    inventoryValue,
    pendingApprovals,
    unbilledWip,
    activeListings,
    bidsReceived,
    activeContracts,
    contractValue,
    activeMigrations,
    activeExperiments,
  ] = await Promise.all([
    // Total revenue: sum of credit on Revenue accounts in posted journal entries
    prisma.journalLine.aggregate({
      _sum: { credit: true },
      where: {
        journalEntry: {
          organizationId: orgId,
          status: "Posted",
        },
        account: {
          type: "Revenue",
        },
      },
    }),
    // Total expenses: sum of debit on Expense accounts in posted journal entries
    prisma.journalLine.aggregate({
      _sum: { debit: true },
      where: {
        journalEntry: {
          organizationId: orgId,
          status: "Posted",
        },
        account: {
          type: "Expense",
        },
      },
    }),
    // Outstanding invoices (not Paid or Void)
    prisma.invoice.count({
      where: {
        organizationId: orgId,
        status: { notIn: ["Paid", "Void"] },
      },
    }),
    // Active R&D projects
    prisma.rdProject.count({
      where: {
        organizationId: orgId,
        status: "Active",
      },
    }),
    // Recent journal entries (last 5)
    prisma.journalEntry.findMany({
      where: { organizationId: orgId },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        lines: {
          include: { account: true },
        },
      },
    }),
    // R&D claim estimate: sum of debit on R&D eligible expense accounts in posted entries
    prisma.journalLine.aggregate({
      _sum: { debit: true },
      where: {
        journalEntry: {
          organizationId: orgId,
          status: "Posted",
        },
        account: {
          type: "Expense",
          isRdEligible: true,
        },
      },
    }),
    // Monthly journal lines for charts (last 6 months)
    prisma.journalLine.findMany({
      where: {
        journalEntry: {
          organizationId: orgId,
          status: "Posted",
        },
      },
      include: {
        account: true,
        journalEntry: { select: { date: true } },
      },
    }),
    // R&D expenses by category
    prisma.rdExpense.findMany({
      where: {
        rdProject: { organizationId: orgId },
      },
      include: {
        journalLine: true,
      },
    }),
    // --- New module queries ---
    // Employees
    prisma.employee.count({ where: { organizationId: orgId, active: true } }),
    // Latest pay run
    prisma.payRun.findFirst({ where: { organizationId: orgId, status: "Completed" }, orderBy: { payDate: "desc" } }),
    // Tax savings from implemented strategies
    prisma.taxMinimisationStrategy.aggregate({
      _sum: { estimatedSaving: true },
      where: { organizationId: orgId, implemented: true },
    }),
    // Pending leave requests
    prisma.leaveRequest.count({ where: { organizationId: orgId, status: "Pending" } }),
    // Active projects (costing)
    prisma.project.count({ where: { organizationId: orgId, status: "Active" } }),
    // Inventory value
    prisma.inventoryItem.findMany({ where: { organizationId: orgId, isTracked: true, isActive: true }, select: { quantityOnHand: true, costPrice: true } }),
    // Pending approvals
    prisma.approvalRequest.count({ where: { organizationId: orgId, status: { in: ["Pending", "InProgress"] } } }),
    // Unbilled WIP
    prisma.timeEntry.findMany({ where: { organizationId: orgId, billable: true, billed: false }, select: { hours: true, hourlyRate: true } }),
    // Marketplace: active listings
    prisma.marketplaceListing.count({ where: { organizationId: orgId, status: "Open" } }),
    // Marketplace: bids received
    prisma.marketplaceBid.count({ where: { listing: { organizationId: orgId } } }),
    // Marketplace: active contracts
    prisma.marketplaceContract.count({ where: { organizationId: orgId, status: "Active" } }),
    // Marketplace: contract value
    prisma.marketplaceContract.aggregate({ _sum: { agreedAmount: true }, where: { organizationId: orgId, status: "Active" } }),
    // Active migrations
    prisma.migrationJob.count({ where: { organizationId: orgId, status: { in: ["Pending", "Validating", "Importing", "Transforming", "Reconciling", "PendingReview"] } } }),
    // Active experiments
    prisma.experiment.count({ where: { rdActivity: { rdProject: { organizationId: orgId } }, status: "InProgress" } }),
  ])

  const totalRevenue = revenueResult._sum.credit ?? 0
  const totalExpenses = expenseResult._sum.debit ?? 0
  const netProfit = totalRevenue - totalExpenses
  const estimatedRdClaim = rdClaimEstimate._sum.debit ?? 0

  // New module computed values
  const monthlyPayroll = latestPayRun?.totalGross ?? 0
  const totalTaxSavings = taxSavings._sum.estimatedSaving ?? 0
  const totalInventoryValue = inventoryValue.reduce((sum: number, i: any) => sum + (i.quantityOnHand * i.costPrice), 0)
  const totalUnbilledWip = unbilledWip.reduce((sum: number, t: any) => sum + (t.hours * t.hourlyRate), 0)
  const totalContractValue = contractValue._sum.agreedAmount ?? 0

  // Build chart data: Revenue vs Expenses by month (last 6 months)
  const now = new Date()
  const monthLabels: { key: string; label: string; start: Date; end: Date }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const label = d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
    monthLabels.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label, start: d, end })
  }

  const revenueExpenseData = monthLabels.map((m) => {
    let revenue = 0
    let expenses = 0
    for (const line of monthlyJournalLines) {
      const lineDate = new Date(line.journalEntry.date)
      if (lineDate >= m.start && lineDate <= m.end) {
        if (line.account.type === "Revenue") revenue += line.credit
        if (line.account.type === "Expense") expenses += line.debit
      }
    }
    return { month: m.label, revenue, expenses }
  })

  const cashFlowData = monthLabels.map((m) => {
    let inflow = 0
    let outflow = 0
    for (const line of monthlyJournalLines) {
      const lineDate = new Date(line.journalEntry.date)
      if (lineDate >= m.start && lineDate <= m.end) {
        inflow += line.credit
        outflow += line.debit
      }
    }
    return { month: m.label, inflow, outflow, net: inflow - outflow }
  })

  // R&D spend by category
  const rdCategoryMap = new Map<string, number>()
  for (const expense of rdExpensesByCategory) {
    const cat = expense.category || "Uncategorized"
    rdCategoryMap.set(cat, (rdCategoryMap.get(cat) || 0) + (expense.journalLine?.debit || 0))
  }
  const rdCategoryData = Array.from(rdCategoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  // Build 7-day sparkline data for revenue and expenses
  const sparklineDays = 7
  const sparklineRevenue: { value: number }[] = []
  const sparklineExpenses: { value: number }[] = []
  const sparklineProfit: { value: number }[] = []
  for (let i = sparklineDays - 1; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), 23, 59, 59)
    let dayRev = 0
    let dayExp = 0
    for (const line of monthlyJournalLines) {
      const lineDate = new Date(line.journalEntry.date)
      if (lineDate >= dayStart && lineDate <= dayEnd) {
        if (line.account.type === "Revenue") dayRev += line.credit
        if (line.account.type === "Expense") dayExp += line.debit
      }
    }
    sparklineRevenue.push({ value: dayRev })
    sparklineExpenses.push({ value: dayExp })
    sparklineProfit.push({ value: dayRev - dayExp })
  }

  const kpis = [
    {
      label: "Revenue",
      value: formatCurrency(totalRevenue),
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      sparklineData: sparklineRevenue,
      sparklineColor: "#4f46e5",
      icon: (
        <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
        </svg>
      ),
    },
    {
      label: "Expenses",
      value: formatCurrency(totalExpenses),
      color: "text-rose-700",
      bg: "bg-rose-50",
      border: "border-rose-200",
      sparklineData: sparklineExpenses,
      sparklineColor: "#f43f5e",
      icon: (
        <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.306-4.306a11.95 11.95 0 015.814 5.518l2.74 1.22m0 0l-5.94 2.281m5.94-2.28l-2.28-5.941" />
        </svg>
      ),
    },
    {
      label: "Net Profit",
      value: formatCurrency(netProfit),
      color: netProfit >= 0 ? "text-emerald-700" : "text-rose-700",
      bg: netProfit >= 0 ? "bg-emerald-50" : "bg-rose-50",
      border: netProfit >= 0 ? "border-emerald-200" : "border-rose-200",
      sparklineData: sparklineProfit,
      sparklineColor: netProfit >= 0 ? "#10b981" : "#f43f5e",
      icon: (
        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Outstanding Invoices",
      value: outstandingInvoices.toString(),
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: (
        <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      label: "Active R&D Projects",
      value: activeRdProjects.toString(),
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      icon: (
        <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
    },
    {
      label: "Estimated R&D Claim",
      value: formatCurrency(estimatedRdClaim),
      color: "text-violet-700",
      bg: "bg-violet-50",
      border: "border-violet-200",
      icon: (
        <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Financial overview and R&D insights
        </p>
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist />

      {/* Quick Stats */}
      <QuickStats />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <SparklineCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            color={kpi.color}
            bg={kpi.bg}
            border={kpi.border}
            icon={kpi.icon}
            sparklineData={kpi.sparklineData}
            sparklineColor={kpi.sparklineColor}
          />
        ))}
      </div>

      {/* People & Operations */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Employees", value: employeeCount.toString(), href: "/payroll/employees", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Monthly Payroll", value: formatCurrency(monthlyPayroll), href: "/payroll", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Tax Savings", value: formatCurrency(totalTaxSavings), href: "/payroll/tax-strategies", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Pending Leave", value: pendingLeave.toString(), href: "/payroll/leave", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "Active Projects", value: activeProjects.toString(), href: "/projects", color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
          { label: "Experiments", value: activeExperiments.toString(), href: "/rd/experiments", color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className={`rounded-xl border border-slate-200 dark:border-slate-700 ${item.bg} p-4 transition-shadow hover:shadow-md`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className={`mt-1 text-lg font-bold ${item.color}`}>{item.value}</p>
          </Link>
        ))}
      </div>

      {/* Operations & Marketplace */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Inventory Value", value: formatCurrency(totalInventoryValue), href: "/inventory", color: "text-teal-700 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-900/20" },
          { label: "Pending Approvals", value: pendingApprovals.toString(), href: "/approvals", color: pendingApprovals > 0 ? "text-amber-700 dark:text-amber-400" : "text-slate-700 dark:text-slate-400", bg: pendingApprovals > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-800" },
          { label: "Unbilled WIP", value: formatCurrency(totalUnbilledWip), href: "/time-tracking", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
          { label: "Marketplace Listings", value: activeListings.toString(), href: "/marketplace/listings", color: "text-pink-700 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20" },
          { label: "Bids Received", value: bidsReceived.toString(), href: "/marketplace", color: "text-pink-700 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20" },
          { label: "Contract Value", value: formatCurrency(totalContractValue), href: "/marketplace/contracts", color: "text-pink-700 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className={`rounded-xl border border-slate-200 dark:border-slate-700 ${item.bg} p-4 transition-shadow hover:shadow-md`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className={`mt-1 text-lg font-bold ${item.color}`}>{item.value}</p>
          </Link>
        ))}
      </div>

      {activeMigrations > 0 && (
        <Link href="/migration" className="block rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{activeMigrations} Active Migration{activeMigrations > 1 ? "s" : ""}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Data migration in progress — click to view status</p>
            </div>
          </div>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: "New Invoice", href: "/invoices/new" },
            { label: "New Bill", href: "/bills/new" },
            { label: "Run Payroll", href: "/payroll/pay-runs/new" },
            { label: "New Project", href: "/projects/new" },
            { label: "Log Time", href: "/time-tracking" },
            { label: "Start Migration", href: "/migration/new" },
            { label: "Post to Market", href: "/marketplace/requirements/new" },
            { label: "View Reports", href: "/reports" },
          ].map((a) => (
            <Link key={a.label} href={a.href} className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-center text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400">
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueExpensesChart data={revenueExpenseData} />
        <CashFlowChart data={cashFlowData} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-1">
        <RdSpendByCategoryChart data={rdCategoryData} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-4 sm:px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Recent Transactions
            </h2>
            <Link
              href="/journal-entries"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 sm:px-6 py-3">Date</th>
                  <th className="px-4 sm:px-6 py-3">Reference</th>
                  <th className="hidden sm:table-cell px-4 sm:px-6 py-3">Narration</th>
                  <th className="px-4 sm:px-6 py-3">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {recentEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500"
                    >
                      No journal entries yet
                    </td>
                  </tr>
                ) : (
                  recentEntries.map((entry) => {
                    const totalDebit = entry.lines.reduce(
                      (sum, l) => sum + l.debit,
                      0
                    )
                    return (
                      <tr
                        key={entry.id}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <td className="whitespace-nowrap px-4 sm:px-6 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {formatDate(entry.date)}
                        </td>
                        <td className="whitespace-nowrap px-4 sm:px-6 py-3 text-sm font-mono text-slate-500 dark:text-slate-400">
                          {entry.reference ?? `JE-${entry.entryNumber}`}
                        </td>
                        <td className="hidden sm:table-cell max-w-[200px] truncate px-4 sm:px-6 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {entry.narration}
                        </td>
                        <td className="whitespace-nowrap px-4 sm:px-6 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              entry.status === "Posted"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : entry.status === "Draft"
                                  ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 sm:px-6 py-3 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                          {formatCurrency(totalDebit)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* R&D Quick Stats */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              R&D Quick Stats
            </h2>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700 p-2">
            <div className="flex items-center justify-between rounded-lg px-4 py-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">Active Projects</span>
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                {activeRdProjects}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-4 py-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Eligible Expenses
              </span>
              <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">
                {formatCurrency(estimatedRdClaim)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-4 py-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Est. Tax Offset (43.5%)
              </span>
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(estimatedRdClaim * 0.435)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-4 py-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">R&D as % of Expenses</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {totalExpenses > 0
                  ? ((estimatedRdClaim / totalExpenses) * 100).toFixed(1)
                  : "0.0"}
                %
              </span>
            </div>
          </div>
          <div className="px-6 pb-4">
            <Link
              href="/rd"
              className="block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              View R&D Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  )
}
