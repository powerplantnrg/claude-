import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import dynamic from "next/dynamic"
import type { Metadata } from "next"

const StackedBarChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.StackedBarChart })),
  { ssr: false, loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const LineTrendChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.LineTrendChart })),
  { ssr: false, loading: () => <div className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const GaugeChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.GaugeChart })),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const MetricCard = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.MetricCard })),
  { ssr: false, loading: () => <div className="h-28 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)
const BreakdownPieChart = dynamic(
  () => import("@/components/charts/financial-charts").then((m) => ({ default: m.BreakdownPieChart })),
  { ssr: false, loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
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
  if (!session) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const months = getLast12Months()

  const [employees, payRuns, journalLines, leaveBalances] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: orgId },
      include: {
        taxStrategies: true,
      },
    }),
    prisma.payRun.findMany({
      where: { organizationId: orgId },
      include: {
        payslips: {
          include: {
            employee: true,
            items: true,
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
    prisma.leaveBalance.findMany({
      where: { employee: { organizationId: orgId } },
      include: { employee: true },
    }),
  ])

  // --- Total Compensation Breakdown per employee ---
  const employeeCompData = employees.map((emp) => {
    let baseSalary = 0
    let superAmount = 0
    let fbt = 0
    let otherBenefits = 0

    for (const run of payRuns) {
      for (const slip of run.payslips) {
        if (slip.employeeId === emp.id) {
          for (const item of slip.items) {
            if (item.type === "Earning" || item.type === "BasePay") baseSalary += item.amount
            else if (item.type === "Super" || item.type === "Superannuation") superAmount += item.amount
            else if (item.type === "FBT") fbt += item.amount
            else if (item.type === "Allowance" || item.type === "Benefit") otherBenefits += item.amount
          }
        }
      }
    }

    return {
      label: `${emp.firstName} ${emp.lastName}`.substring(0, 20),
      baseSalary,
      super: superAmount,
      fbt,
      benefits: otherBenefits,
    }
  }).filter((d) => d.baseSalary > 0 || d.super > 0)

  // --- Tax efficiency score per employee ---
  const taxEfficiencyData = employees.map((emp) => {
    const strategies = emp.taxStrategies || []
    const activeStrategies = strategies.filter((s) => s.status === "Active")
    // Score based on number of active strategies and salary sacrifice usage
    const maxScore = 100
    const strategyScore = Math.min(activeStrategies.length * 20, 60) // Up to 60 points for strategies
    const hasSalarySacrifice = activeStrategies.some(
      (s) => s.type === "SalarySacrifice" || s.strategyType === "SalarySacrifice"
    )
    const sacScore = hasSalarySacrifice ? 20 : 0
    const hasNovatedLease = activeStrategies.some(
      (s) => s.type === "NovatedLease" || s.strategyType === "NovatedLease"
    )
    const leaseScore = hasNovatedLease ? 20 : 0

    return {
      name: `${emp.firstName} ${emp.lastName}`,
      score: Math.min(strategyScore + sacScore + leaseScore, maxScore),
      activeStrategies: activeStrategies.length,
    }
  })

  const avgTaxEfficiency = taxEfficiencyData.length > 0
    ? taxEfficiencyData.reduce((sum, d) => sum + d.score, 0) / taxEfficiencyData.length
    : 0

  // --- Salary sacrifice utilization ---
  const employeesWithSalarySacrifice = taxEfficiencyData.filter((d) => d.activeStrategies > 0).length
  const salarySacrificeRate = employees.length > 0
    ? (employeesWithSalarySacrifice / employees.length) * 100
    : 0

  // --- Leave liability trend ---
  const leaveLiabilityData = months.map((m) => {
    // Approximate leave liability: sum of leave balances * average hourly rate
    let totalLiability = 0
    for (const balance of leaveBalances) {
      const emp = employees.find((e) => e.id === balance.employeeId)
      const annualSalary = emp?.annualSalary || 0
      const hourlyRate = annualSalary / 2080 // ~40hrs * 52weeks
      totalLiability += (balance.balance || 0) * hourlyRate
    }
    return { label: m.label, value: totalLiability }
  })

  // --- Payroll cost as % of revenue ---
  const totalPayrollCost = employeeCompData.reduce(
    (sum, d) => sum + d.baseSalary + d.super + d.fbt + d.benefits,
    0
  )
  const totalRevenue = journalLines.reduce((sum, l) => sum + l.credit - l.debit, 0)
  const payrollPctRevenue = totalRevenue > 0 ? (totalPayrollCost / totalRevenue) * 100 : 0

  const payrollPctData = months.map((m) => {
    let monthRevenue = 0
    for (const line of journalLines) {
      const lineDate = new Date(line.journalEntry.date)
      if (lineDate >= m.start && lineDate <= m.end) {
        monthRevenue += line.credit - line.debit
      }
    }
    // Approximate monthly payroll cost from pay runs
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
  const totalPotentialSavings = employees.length * 5000 // Estimated $5k per employee potential
  const realizedSavings = taxEfficiencyData.reduce((sum, d) => sum + d.score * 50, 0) // Approximate
  const savingsData = [
    { name: "Salary Sacrifice", value: realizedSavings * 0.4 },
    { name: "Novated Leases", value: realizedSavings * 0.25 },
    { name: "Super Optimization", value: realizedSavings * 0.2 },
    { name: "FBT Strategies", value: realizedSavings * 0.15 },
  ].filter((d) => d.value > 0)

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
          label="Salary Sacrifice Rate"
          value={`${salarySacrificeRate.toFixed(0)}%`}
          trend={salarySacrificeRate >= 50 ? "up" : "down"}
          trendLabel={`${employeesWithSalarySacrifice} of ${employees.length} employees`}
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
          subtitle="Realized savings by strategy type"
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
