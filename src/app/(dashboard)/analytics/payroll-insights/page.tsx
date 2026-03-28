import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import dynamic from "next/dynamic"
import type { Metadata } from "next"

const StackedBarChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.StackedBarChart })),
  { loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const LineTrendChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.LineTrendChart })),
  { loading: () => <div className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const GaugeChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.GaugeChart })),
  { loading: () => <div className="h-40 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const MetricCard = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.MetricCard })),
  { loading: () => <div className="h-28 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const BreakdownPieChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.BreakdownPieChart })),
  { loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)

export const metadata: Metadata = {
  title: "Payroll Insights",
}

function getLast12Months(): { start: Date; end: Date; label: string }[] {
  const months: { start: Date; end: Date; label: string }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    const label = d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
    months.push({
      start: new Date(year, month, 1),
      end: new Date(year, month, lastDay, 23, 59, 59, 999),
      label,
    })
  }
  return months
}

export default async function PayrollInsightsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const months = getLast12Months()

  const [employees, payRuns, journalLines, novatedLeases, taxStrategies] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: orgId },
      include: {
        novatedLeases: true,
        fbtRecords: true,
      },
    }),
    prisma.payRun.findMany({
      where: { organizationId: orgId },
      include: {
        payslips: {
          include: {
            employee: true,
            earnings: true,
            deductions: true,
          },
        },
      },
      orderBy: { payPeriodEnd: "desc" },
    }),
    prisma.journalLine.findMany({
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
        account: { type: "Revenue" },
      },
      include: {
        account: true,
        journalEntry: { select: { date: true } },
      },
    }),
    prisma.novatedLease.findMany({
      where: { organizationId: orgId },
    }),
    prisma.taxMinimisationStrategy.findMany({
      where: { organizationId: orgId },
    }),
  ])

  // --- Total Compensation Breakdown per employee ---
  const employeeCompData = employees.map((emp) => {
    let baseSalary = 0
    let superAmount = 0
    let fbtAmount = 0
    let otherBenefits = 0

    for (const run of payRuns) {
      for (const slip of run.payslips) {
        if (slip.employeeId === emp.id) {
          baseSalary += slip.grossPay
          superAmount += slip.superContribution + slip.superSalarySacrifice
          otherBenefits += slip.allowances + slip.bonuses
        }
      }
    }

    // FBT from records
    for (const fbt of emp.fbtRecords) {
      fbtAmount += fbt.grossValue || 0
    }

    return {
      label: `${emp.firstName} ${emp.lastName}`.substring(0, 20),
      baseSalary,
      super: superAmount,
      fbt: fbtAmount,
      benefits: otherBenefits,
    }
  }).filter((d) => d.baseSalary > 0 || d.super > 0)

  // --- Tax efficiency score per employee ---
  const taxEfficiencyData = employees.map((emp) => {
    let score = 0
    const maxScore = 100

    // Check salary sacrifice usage
    let hasSalarySacrifice = false
    for (const run of payRuns) {
      for (const slip of run.payslips) {
        if (slip.employeeId === emp.id && slip.superSalarySacrifice > 0) {
          hasSalarySacrifice = true
        }
      }
    }
    if (hasSalarySacrifice) score += 30

    // Check novated lease
    const hasNovatedLease = emp.novatedLeases.some((nl) => nl.status === "Active")
    if (hasNovatedLease) score += 25

    // Check pre-tax deductions
    let hasPreTaxDeductions = false
    for (const run of payRuns) {
      for (const slip of run.payslips) {
        if (slip.employeeId === emp.id && slip.preTaxDeductions > 0) {
          hasPreTaxDeductions = true
        }
      }
    }
    if (hasPreTaxDeductions) score += 20

    // Check if claiming tax-free threshold optimally
    if (emp.taxFreeThreshold) score += 15

    // Super rate above minimum
    if (emp.superRate > 11.5) score += 10

    return {
      name: `${emp.firstName} ${emp.lastName}`,
      score: Math.min(score, maxScore),
      hasSalarySacrifice,
      hasNovatedLease,
    }
  })

  const avgTaxEfficiency = taxEfficiencyData.length > 0
    ? taxEfficiencyData.reduce((sum: number, d) => sum + d.score, 0) / taxEfficiencyData.length
    : 0

  // --- Salary sacrifice utilization ---
  const employeesWithSalarySacrifice = taxEfficiencyData.filter((d) => d.hasSalarySacrifice).length
  const salarySacrificeRate = employees.length > 0
    ? (employeesWithSalarySacrifice / employees.length) * 100
    : 0

  // --- Leave liability trend ---
  const leaveLiabilityData = months.map((m) => {
    let totalLiability = 0
    for (const emp of employees) {
      const annualSalary = emp.annualSalary || 0
      const hourlyRate = annualSalary / 2080
      const totalLeaveHours = (emp.leaveBalanceAnnual || 0) + (emp.leaveBalanceSick || 0) + (emp.leaveBalancePersonal || 0)
      totalLiability += totalLeaveHours * hourlyRate
    }
    return { label: m.label, value: totalLiability }
  })

  // --- Payroll cost as % of revenue ---
  const totalPayrollCost = employeeCompData.reduce(
    (sum: number, d) => sum + d.baseSalary + d.super + d.fbt + d.benefits,
    0
  )
  const totalRevenue = journalLines.reduce((sum: number, l) => sum + l.credit - l.debit, 0)
  const payrollPctRevenue = totalRevenue > 0 ? (totalPayrollCost / totalRevenue) * 100 : 0

  const payrollPctData = months.map((m) => {
    let monthRevenue = 0
    for (const line of journalLines) {
      const lineDate = new Date(line.journalEntry.date)
      if (lineDate >= m.start && lineDate <= m.end) {
        monthRevenue += line.credit - line.debit
      }
    }
    let monthPayroll = 0
    for (const run of payRuns) {
      const runDate = new Date(run.payPeriodEnd)
      if (runDate >= m.start && runDate <= m.end) {
        for (const slip of run.payslips) {
          monthPayroll += slip.grossPay || 0
        }
      }
    }
    const pct = monthRevenue > 0 ? (monthPayroll / monthRevenue) * 100 : 0
    return { label: m.label, value: parseFloat(pct.toFixed(1)) }
  })

  // --- Tax savings breakdown ---
  const implementedStrategies = taxStrategies.filter((s) => s.implemented)
  const realizedSavings = implementedStrategies.reduce((sum: number, s) => sum + (s.estimatedSaving || 0), 0)
  const potentialSavings = taxStrategies.reduce((sum: number, s) => sum + (s.estimatedSaving || 0), 0)

  const savingsByCategory: Record<string, number> = {}
  for (const strategy of implementedStrategies) {
    const cat = strategy.category || "Other"
    savingsByCategory[cat] = (savingsByCategory[cat] || 0) + (strategy.estimatedSaving || 0)
  }
  const savingsData = Object.entries(savingsByCategory)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/analytics" className="hover:text-indigo-600 dark:hover:text-indigo-400">Analytics</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Payroll Insights</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Compensation analysis, tax efficiency, and payroll intelligence
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Payroll Cost"
          value={formatCurrency(totalPayrollCost)}
          trend="neutral"
          trendLabel={`${employees.length} employees`}
        />
        <MetricCard
          label="Payroll % of Revenue"
          value={`${payrollPctRevenue.toFixed(1)}%`}
          trend={payrollPctRevenue < 40 ? "up" : "down"}
          trendLabel={payrollPctRevenue < 40 ? "Healthy ratio" : "Above benchmark"}
        />
        <MetricCard
          label="Avg Tax Efficiency"
          value={`${avgTaxEfficiency.toFixed(0)}/100`}
          trend={avgTaxEfficiency >= 50 ? "up" : "down"}
          trendLabel="Across all employees"
        />
        <MetricCard
          label="Realized vs Potential Savings"
          value={formatCurrency(realizedSavings)}
          trend={potentialSavings > 0 && realizedSavings / potentialSavings > 0.5 ? "up" : "down"}
          trendLabel={`${formatCurrency(potentialSavings)} potential`}
        />
      </div>

      {/* Gauge charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GaugeChart
          value={avgTaxEfficiency}
          max={100}
          label="Avg Tax Efficiency Score"
          color="#10b981"
        />
        <GaugeChart
          value={salarySacrificeRate}
          max={100}
          label="Salary Sacrifice Utilization"
          color="#4f46e5"
        />
        <GaugeChart
          value={payrollPctRevenue}
          max={60}
          label="Payroll as % of Revenue"
          color="#f59e0b"
        />
      </div>

      {/* Total Compensation Breakdown */}
      {employeeCompData.length > 0 && (
        <StackedBarChart
          data={employeeCompData}
          title="Total Compensation Breakdown"
          subtitle="Salary vs Super vs FBT vs Benefits per employee"
          keys={[
            { dataKey: "baseSalary", name: "Base Salary" },
            { dataKey: "super", name: "Superannuation" },
            { dataKey: "fbt", name: "FBT" },
            { dataKey: "benefits", name: "Other Benefits" },
          ]}
          colors={["#4f46e5", "#10b981", "#f59e0b", "#8b5cf6"]}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tax Efficiency by Employee */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tax Efficiency by Employee</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Score based on active tax optimization strategies</p>
          </div>
          <div className="p-6 space-y-3">
            {taxEfficiencyData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                No employee data available
              </div>
            ) : (
              taxEfficiencyData.map((emp) => (
                <div key={emp.name} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                    {emp.name}
                  </div>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${emp.score}%`,
                          backgroundColor: emp.score >= 60 ? "#10b981" : emp.score >= 30 ? "#f59e0b" : "#f43f5e",
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {emp.score}/100
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tax Savings Breakdown */}
        <BreakdownPieChart
          data={savingsData}
          title="Tax Minimisation Savings"
          subtitle="Realized savings by strategy category"
        />
      </div>

      {/* Leave Liability Trend */}
      <LineTrendChart
        data={leaveLiabilityData}
        title="Leave Liability Trend"
        subtitle="Estimated monetary value of accrued leave balances"
        color="#f43f5e"
      />

      {/* Payroll Cost as % of Revenue */}
      <LineTrendChart
        data={payrollPctData}
        title="Payroll Cost as % of Revenue"
        subtitle="Monthly payroll expenditure relative to revenue"
        color="#4f46e5"
        yAxisFormatter={(v: number) => `${v}%`}
        tooltipFormatter={(v: number) => `${v}%`}
      />
    </div>
  )
}
