import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ScenarioActions } from "./scenario-actions"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount)
}

export default async function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const scenario = await prisma.scenario.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!scenario) notFound()

  const baseline = scenario.baselineJson ? JSON.parse(scenario.baselineJson) : null
  const variables = scenario.variablesJson ? JSON.parse(scenario.variablesJson) : null
  const results = scenario.resultsJson ? JSON.parse(scenario.resultsJson) : null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/scenarios" className="hover:text-indigo-600">Scenarios</Link>
        <span>/</span>
        <span className="text-slate-700">{scenario.name}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{scenario.name}</h1>
        {scenario.description && (
          <p className="mt-1 text-sm text-slate-500">{scenario.description}</p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          Created {new Date(scenario.createdAt).toLocaleDateString("en-AU", {
            day: "2-digit", month: "short", year: "numeric",
          })}
        </p>
      </div>

      {baseline && variables && results ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Baseline & Variables */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Baseline Assumptions</h2>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Revenue", value: baseline.revenue },
                  { label: "Total Expenses", value: baseline.expenses },
                  { label: "R&D Spend", value: baseline.rdSpend },
                  { label: "Cloud Costs", value: baseline.cloudCosts },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="font-mono text-sm font-medium tabular-nums text-slate-900">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm text-slate-600">Cash Runway</span>
                  <span className="text-sm font-medium text-slate-900">{baseline.runway} months</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Scenario Variables</h2>
              <div className="mt-4 space-y-3">
                {[
                  { label: "GPU/Cloud Cost Change", value: variables.gpuCostChange },
                  { label: "Training Run Multiplier", value: variables.trainingRunMultiplier },
                  { label: "Revenue Growth", value: variables.revenueGrowth },
                  { label: "Headcount Change", value: variables.headcountChange },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className={`text-sm font-bold tabular-nums ${
                      (item.value || 0) > 0 ? "text-rose-600" :
                      (item.value || 0) < 0 ? "text-emerald-600" : "text-slate-500"
                    }`}>
                      {(item.value || 0) > 0 ? "+" : ""}{item.value || 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Projected Results</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Monthly Burn</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(results.projectedBurn)}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Runway</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {results.projectedRunway === null ? "Unlimited" : `${results.projectedRunway} months`}
                </p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">R&D Claim</p>
                <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(results.projectedRdClaim)}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Margin Impact</p>
                <p className={`mt-1 text-xl font-bold ${results.marginImpact >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {results.marginImpact >= 0 ? "+" : ""}{results.marginImpact}pp
                </p>
              </div>
            </div>

            {results.details && (
              <div className="mt-6 space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Breakdown</h3>
                {[
                  { label: "Projected Revenue", value: results.details.projectedRevenue },
                  { label: "Projected Expenses", value: results.details.projectedExpenses },
                  { label: "Projected R&D Spend", value: results.details.projectedRdSpend },
                  { label: "Projected Cloud Costs", value: results.details.projectedCloudCosts },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg bg-white p-3">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">Scenario data is not available for display</p>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/scenarios"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to Simulator
        </Link>
        <ScenarioActions
          scenarioId={id}
          variables={variables}
          baseline={baseline}
        />
      </div>
    </div>
  )
}
