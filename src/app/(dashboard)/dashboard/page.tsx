import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  TrendingUp, TrendingDown, DollarSign, FileText, Receipt, FlaskConical,
  ShieldCheck, Users, Banknote, CalendarDays, FolderKanban, Beaker,
  Package, CheckSquare, Clock, Store, Briefcase, ArrowRight,
  Plus, Play, Upload, BarChart3, ArrowRightLeft,
} from "lucide-react"

const RevenueExpensesChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((m) => ({ default: m.RevenueExpensesChart })),
  { loading: () => <div className="h-72 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl" /> }
)
const CashFlowChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((m) => ({ default: m.CashFlowChart })),
  { loading: () => <div className="h-72 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl" /> }
)
const RdSpendByCategoryChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((m) => ({ default: m.RdSpendByCategoryChart })),
  { loading: () => <div className="h-72 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl" /> }
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
    prisma.journalLine.aggregate({
      _sum: { credit: true },
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Revenue" },
      },
    }),
    prisma.journalLine.aggregate({
      _sum: { debit: true },
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Expense" },
      },
    }),
    prisma.invoice.count({
      where: { organizationId: orgId, status: { notIn: ["Paid", "Void"] } },
    }),
    prisma.rdProject.count({
      where: { organizationId: orgId, status: "Active" },
    }),
    prisma.journalEntry.findMany({
      where: { organizationId: orgId },
      orderBy: { date: "desc" },
      take: 5,
      include: { lines: { include: { account: true } } },
    }),
    prisma.journalLine.aggregate({
      _sum: { debit: true },
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Expense", isRdEligible: true },
      },
    }),
    prisma.journalLine.findMany({
      where: { journalEntry: { organizationId: orgId, status: "Posted" } },
      include: {
        account: true,
        journalEntry: { select: { date: true } },
      },
    }),
    prisma.rdExpense.findMany({
      where: { rdProject: { organizationId: orgId } },
      include: { journalLine: true },
    }),
    prisma.employee.count({ where: { organizationId: orgId, active: true } }),
    prisma.payRun.findFirst({ where: { organizationId: orgId, status: "Completed" }, orderBy: { payDate: "desc" } }),
    prisma.taxMinimisationStrategy.aggregate({
      _sum: { estimatedSaving: true },
      where: { organizationId: orgId, implemented: true },
    }),
    prisma.leaveRequest.count({ where: { organizationId: orgId, status: "Pending" } }),
    prisma.project.count({ where: { organizationId: orgId, status: "Active" } }),
    prisma.inventoryItem.findMany({ where: { organizationId: orgId, isTracked: true, isActive: true }, select: { quantityOnHand: true, costPrice: true } }),
    prisma.approvalRequest.count({ where: { organizationId: orgId, status: { in: ["Pending", "InProgress"] } } }),
    prisma.timeEntry.findMany({ where: { organizationId: orgId, billable: true, billed: false }, select: { hours: true, hourlyRate: true } }),
    prisma.marketplaceListing.count({ where: { organizationId: orgId, status: "Open" } }),
    prisma.marketplaceBid.count({ where: { listing: { organizationId: orgId } } }),
    prisma.marketplaceContract.count({ where: { organizationId: orgId, status: "Active" } }),
    prisma.marketplaceContract.aggregate({ _sum: { agreedAmount: true }, where: { organizationId: orgId, status: "Active" } }),
    prisma.migrationJob.count({ where: { organizationId: orgId, status: { in: ["Pending", "Validating", "Importing", "Transforming", "Reconciling", "PendingReview"] } } }),
    prisma.experiment.count({ where: { rdActivity: { rdProject: { organizationId: orgId } }, status: "InProgress" } }),
  ])

  const totalRevenue = revenueResult._sum.credit ?? 0
  const totalExpenses = expenseResult._sum.debit ?? 0
  const netProfit = totalRevenue - totalExpenses
  const estimatedRdClaim = rdClaimEstimate._sum.debit ?? 0

  const monthlyPayroll = latestPayRun?.totalGross ?? 0
  const totalTaxSavings = taxSavings._sum.estimatedSaving ?? 0
  const totalInventoryValue = inventoryValue.reduce((sum: number, i: any) => sum + (i.quantityOnHand * i.costPrice), 0)
  const totalUnbilledWip = unbilledWip.reduce((sum: number, t: any) => sum + (t.hours * t.hourlyRate), 0)
  const totalContractValue = contractValue._sum.agreedAmount ?? 0

  // Chart data
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

  const rdCategoryMap = new Map<string, number>()
  for (const expense of rdExpensesByCategory) {
    const cat = expense.category || "Uncategorized"
    rdCategoryMap.set(cat, (rdCategoryMap.get(cat) || 0) + (expense.journalLine?.debit || 0))
  }
  const rdCategoryData = Array.from(rdCategoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  // Sparkline data
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
      color: "text-indigo-700 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      border: "border-indigo-200 dark:border-indigo-800",
      sparklineData: sparklineRevenue,
      sparklineColor: "#6366f1",
      icon: <TrendingUp className="h-5 w-5 text-indigo-500" />,
    },
    {
      label: "Expenses",
      value: formatCurrency(totalExpenses),
      color: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      border: "border-rose-200 dark:border-rose-800",
      sparklineData: sparklineExpenses,
      sparklineColor: "#f43f5e",
      icon: <TrendingDown className="h-5 w-5 text-rose-500" />,
    },
    {
      label: "Net Profit",
      value: formatCurrency(netProfit),
      color: netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400",
      bg: netProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-rose-50 dark:bg-rose-900/20",
      border: netProfit >= 0 ? "border-emerald-200 dark:border-emerald-800" : "border-rose-200 dark:border-rose-800",
      sparklineData: sparklineProfit,
      sparklineColor: netProfit >= 0 ? "#10b981" : "#f43f5e",
      icon: <DollarSign className="h-5 w-5 text-emerald-500" />,
    },
    {
      label: "Outstanding",
      value: outstandingInvoices.toString(),
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      icon: <FileText className="h-5 w-5 text-amber-500" />,
    },
    {
      label: "R&D Projects",
      value: activeRdProjects.toString(),
      color: "text-indigo-700 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      border: "border-indigo-200 dark:border-indigo-800",
      icon: <FlaskConical className="h-5 w-5 text-indigo-500" />,
    },
    {
      label: "R&D Claim",
      value: formatCurrency(estimatedRdClaim),
      color: "text-violet-700 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      border: "border-violet-200 dark:border-violet-800",
      icon: <ShieldCheck className="h-5 w-5 text-violet-500" />,
    },
  ]

  const quickActions = [
    { label: "New Invoice", href: "/invoices/new", icon: Plus, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/30" },
    { label: "New Bill", href: "/bills/new", icon: Receipt, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/30" },
    { label: "Run Payroll", href: "/payroll/pay-runs/new", icon: Play, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
    { label: "New Project", href: "/projects/new", icon: FolderKanban, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
    { label: "Log Time", href: "/time-tracking", icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" },
    { label: "Migration", href: "/migration/new", icon: Upload, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-900/30" },
    { label: "Marketplace", href: "/marketplace/requirements/new", icon: Store, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/30" },
    { label: "Reports", href: "/reports", icon: BarChart3, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/30" },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Financial overview and R&D intelligence for your organization
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Last updated: {new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist />

      {/* Quick Stats */}
      <QuickStats />

      {/* Primary KPI Cards */}
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

      {/* People & Payroll Row */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          People & Payroll
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Employees", value: employeeCount.toString(), href: "/payroll/employees", icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Monthly Payroll", value: formatCurrency(monthlyPayroll), href: "/payroll", icon: Banknote, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Tax Savings", value: formatCurrency(totalTaxSavings), href: "/payroll/tax-strategies", icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Pending Leave", value: pendingLeave.toString(), href: "/payroll/leave", icon: CalendarDays, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "Active Projects", value: activeProjects.toString(), href: "/projects", icon: FolderKanban, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
            { label: "Experiments", value: activeExperiments.toString(), href: "/rd/experiments", icon: Beaker, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.bg} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                  </div>
                </div>
                <p className={`text-lg font-bold tabular-nums ${item.color}`}>{item.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Operations & Marketplace Row */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Operations & Marketplace
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Inventory Value", value: formatCurrency(totalInventoryValue), href: "/inventory", icon: Package, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-900/20" },
            { label: "Pending Approvals", value: pendingApprovals.toString(), href: "/approvals", icon: CheckSquare, color: pendingApprovals > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-400", bg: pendingApprovals > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-800" },
            { label: "Unbilled WIP", value: formatCurrency(totalUnbilledWip), href: "/time-tracking", icon: Clock, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
            { label: "Listings", value: activeListings.toString(), href: "/marketplace/listings", icon: Store, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20" },
            { label: "Bids Received", value: bidsReceived.toString(), href: "/marketplace", icon: ArrowRightLeft, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20" },
            { label: "Contract Value", value: formatCurrency(totalContractValue), href: "/marketplace/contracts", icon: Briefcase, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.bg} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                  </div>
                </div>
                <p className={`text-lg font-bold tabular-nums ${item.color}`}>{item.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Active Migration Banner */}
      {activeMigrations > 0 && (
        <Link
          href="/migration"
          className="group flex items-center gap-4 rounded-2xl border border-blue-200/80 dark:border-blue-800/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
            <ArrowRightLeft className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              {activeMigrations} Active Migration{activeMigrations > 1 ? "s" : ""} in Progress
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Data migration is being processed. Click to view detailed status.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-blue-400 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}

      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                href={action.href}
                className="group flex flex-col items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-3.5 text-center transition-all duration-200 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.bg} transition-transform duration-200 group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${action.color}`} />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                  {action.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <RevenueExpensesChart data={revenueExpenseData} />
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <CashFlowChart data={cashFlowData} />
        </div>
      </div>

      {rdCategoryData.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <RdSpendByCategoryChart data={rdCategoryData} />
        </div>
      )}

      {/* Transactions & R&D Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Recent Transactions
            </h2>
            <Link
              href="/journal-entries"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Reference</th>
                  <th className="hidden sm:table-cell px-6 py-3">Narration</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/50">
                {recentEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-sm text-slate-400 dark:text-slate-500">No journal entries yet</p>
                    </td>
                  </tr>
                ) : (
                  recentEntries.map((entry) => {
                    const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0)
                    return (
                      <tr
                        key={entry.id}
                        className="transition-colors duration-150 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10"
                      >
                        <td className="whitespace-nowrap px-6 py-3.5 text-sm text-slate-700 dark:text-slate-300">
                          {formatDate(entry.date)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3.5 text-sm font-mono text-slate-500 dark:text-slate-400">
                          {entry.reference ?? `JE-${entry.entryNumber}`}
                        </td>
                        <td className="hidden sm:table-cell max-w-[200px] truncate px-6 py-3.5 text-sm text-slate-700 dark:text-slate-300">
                          {entry.narration}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                              entry.status === "Posted"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-600/10 dark:ring-emerald-400/20"
                                : entry.status === "Draft"
                                  ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 ring-1 ring-slate-500/10 dark:ring-slate-400/20"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-600/10 dark:ring-amber-400/20"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              entry.status === "Posted" ? "bg-emerald-500" : entry.status === "Draft" ? "bg-slate-400" : "bg-amber-500"
                            }`} />
                            {entry.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3.5 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
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
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              R&D Intelligence
            </h2>
          </div>
          <div className="divide-y divide-slate-100/80 dark:divide-slate-800/50 p-2">
            {[
              { label: "Active Projects", value: activeRdProjects.toString(), color: "text-indigo-600 dark:text-indigo-400" },
              { label: "Eligible Expenses", value: formatCurrency(estimatedRdClaim), color: "text-violet-600 dark:text-violet-400" },
              { label: "Est. Tax Offset (43.5%)", value: formatCurrency(estimatedRdClaim * 0.435), color: "text-emerald-600 dark:text-emerald-400" },
              { label: "R&D as % of Expenses", value: `${totalExpenses > 0 ? ((estimatedRdClaim / totalExpenses) * 100).toFixed(1) : "0.0"}%`, color: "text-slate-900 dark:text-slate-100" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
                <span className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5 pt-2">
            <Link
              href="/rd"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-500/20 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/30"
            >
              View R&D Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  )
}
