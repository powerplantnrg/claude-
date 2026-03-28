import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import type { Metadata } from "next"
import { RevenueByCustomerChart } from "./revenue-chart"

export const metadata: Metadata = {
  title: "Analytics",
}

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  const [
    journalLines,
    cloudCosts,
    tokenUsage,
    contacts,
    invoices,
    rdProjects,
    experiments,
  ] = await Promise.all([
    prisma.journalLine.findMany({
      where: {
        journalEntry: { organizationId: orgId, status: "Posted" },
      },
      include: {
        account: true,
        journalEntry: { select: { date: true } },
      },
    }),
    prisma.cloudCostEntry.findMany({
      where: { provider: { organizationId: orgId } },
    }),
    prisma.tokenUsage.findMany({
      where: { provider: { organizationId: orgId } },
    }),
    prisma.contact.findMany({
      where: { organizationId: orgId, contactType: "Customer" },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId },
      include: { contact: true },
    }),
    prisma.rdProject.findMany({
      where: { organizationId: orgId, status: "Active" },
      include: {
        rdExpenses: { include: { journalLine: true } },
        activities: { include: { timeEntries: true } },
      },
    }),
    prisma.experiment.findMany({
      where: {
        rdActivity: { rdProject: { organizationId: orgId } },
        status: { in: ["InProgress", "Planned"] },
      },
    }),
  ])

  // Compute KPIs
  const totalRevenue = journalLines
    .filter((l) => l.account.type === "Revenue")
    .reduce((sum, l) => sum + l.credit, 0)

  const totalExpenses = journalLines
    .filter((l) => l.account.type === "Expense")
    .reduce((sum, l) => sum + l.debit, 0)

  const totalCloudCosts = cloudCosts.reduce((sum, c) => sum + c.amount, 0)
  const totalApiCalls = tokenUsage.reduce(
    (sum, t) => sum + t.inputTokens + t.outputTokens,
    0
  )
  const costPerApiCall = totalApiCalls > 0 ? totalCloudCosts / totalApiCalls : 0
  const customerCount = contacts.length || 1
  const revenuePerCustomer = totalRevenue / customerCount

  const totalRdSpend = rdProjects.reduce((projSum, proj) => {
    const expenseSpend = proj.rdExpenses.reduce(
      (sum, exp) => sum + (exp.journalLine.debit || 0),
      0
    )
    const timeSpend = proj.activities.reduce(
      (actSum, act) =>
        actSum +
        act.timeEntries.reduce(
          (teSum, te) => teSum + te.hours * (te.hourlyRate || 0),
          0
        ),
      0
    )
    return projSum + expenseSpend + timeSpend
  }, 0)

  const rdEligibleExpenses = journalLines
    .filter((l) => l.account.type === "Expense" && l.account.isRdEligible)
    .reduce((sum, l) => sum + l.debit, 0)
  const estimatedTaxOffset = rdEligibleExpenses * 0.435
  const rdRoi = totalRdSpend > 0 ? (estimatedTaxOffset / totalRdSpend) * 100 : 0

  const cloudCostPctRevenue =
    totalRevenue > 0 ? (totalCloudCosts / totalRevenue) * 100 : 0

  const cogs = totalCloudCosts
  const grossMargin =
    totalRevenue > 0 ? ((totalRevenue - cogs) / totalRevenue) * 100 : 0

  const activeExperiments = experiments.length

  // Revenue by customer for chart
  const revenueByCustomer: Record<string, { name: string; amount: number }> = {}
  for (const inv of invoices) {
    const name = inv.contact.name
    if (!revenueByCustomer[inv.contactId]) {
      revenueByCustomer[inv.contactId] = { name, amount: 0 }
    }
    revenueByCustomer[inv.contactId].amount += inv.total
  }
  const topCustomers = Object.values(revenueByCustomer)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Expense breakdown by account type
  const expenseByType: Record<string, number> = {}
  for (const line of journalLines) {
    if (line.account.type !== "Expense") continue
    const key = line.account.subType || line.account.name
    expenseByType[key] = (expenseByType[key] || 0) + line.debit
  }
  const expenseBreakdown = Object.entries(expenseByType)
    .map(([type, amount]) => ({ type, amount }))
    .sort((a, b) => b.amount - a.amount)

  const kpis = [
    {
      label: "Cost per API Call",
      value: costPerApiCall > 0 ? `$${costPerApiCall.toFixed(6)}` : "$0.00",
      description: "Cloud costs / total token calls",
    },
    {
      label: "Revenue per Customer",
      value: formatCurrency(revenuePerCustomer),
      description: `${customerCount} active customers`,
    },
    {
      label: "R&D ROI %",
      value: `${rdRoi.toFixed(1)}%`,
      description: "Tax offset / R&D spend",
    },
    {
      label: "Cloud Cost as % of Revenue",
      value: `${cloudCostPctRevenue.toFixed(1)}%`,
      description: formatCurrency(totalCloudCosts) + " total cloud",
    },
    {
      label: "Gross Margin %",
      value: `${grossMargin.toFixed(1)}%`,
      description: "Revenue minus COGS (cloud)",
    },
    {
      label: "Active Experiments",
      value: String(activeExperiments),
      description: "In-progress or planned",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Key performance indicators and financial analytics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{kpi.value}</p>
            <p className="mt-1 text-xs text-slate-400">{kpi.description}</p>
          </div>
        ))}
      </div>

      {/* Revenue by Customer Bar Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Revenue by Customer
        </h2>
        {topCustomers.length > 0 ? (
          <RevenueByCustomerChart
            data={topCustomers.map((c) => ({ name: c.name, amount: c.amount }))}
          />
        ) : (
          <p className="text-sm text-slate-400">No invoice data available.</p>
        )}
      </div>

      {/* Expense Breakdown Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Expense Breakdown by Account Type
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 text-left font-medium text-slate-600">
                  Account Type
                </th>
                <th className="px-6 py-3 text-right font-medium text-slate-600">
                  Amount
                </th>
                <th className="px-6 py-3 text-right font-medium text-slate-600">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody>
              {expenseBreakdown.map((row) => (
                <tr key={row.type} className="border-b border-slate-50">
                  <td className="px-6 py-3 text-slate-800">{row.type}</td>
                  <td className="px-6 py-3 text-right text-slate-800">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-500">
                    {totalExpenses > 0
                      ? ((row.amount / totalExpenses) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </td>
                </tr>
              ))}
              {expenseBreakdown.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                    No expense data available.
                  </td>
                </tr>
              )}
            </tbody>
            {expenseBreakdown.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-6 py-3 text-slate-900">Total</td>
                  <td className="px-6 py-3 text-right text-slate-900">
                    {formatCurrency(totalExpenses)}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-900">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
