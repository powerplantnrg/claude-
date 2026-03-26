"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface ScenarioResult {
  projectedBurn: number
  projectedRunway: number
  projectedRdClaim: number
  marginImpact: number
  details: {
    projectedRevenue: number
    projectedExpenses: number
    projectedRdSpend: number
    projectedCloudCosts: number
  }
}

interface SavedScenario {
  id: string
  name: string
  description: string | null
  createdAt: string
  variablesJson: string | null
  resultsJson: string | null
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount)
}

function runScenario(
  baseline: { revenue: number; expenses: number; rdSpend: number; cloudCosts: number; runway: number },
  variables: Record<string, number>
): ScenarioResult {
  const gpuCostChange = variables.gpuCostChange ?? 0
  const trainingRunMultiplier = variables.trainingRunMultiplier ?? 0
  const revenueGrowth = variables.revenueGrowth ?? 0
  const headcountChange = variables.headcountChange ?? 0

  const projectedRevenue = baseline.revenue * (1 + revenueGrowth / 100)
  const projectedCloudCosts = baseline.cloudCosts * (1 + gpuCostChange / 100)
  const projectedRdSpend = baseline.rdSpend * (1 + trainingRunMultiplier / 100)
  const otherExpenses = baseline.expenses - baseline.cloudCosts - baseline.rdSpend
  const projectedOtherExpenses = otherExpenses * (1 + headcountChange / 100)
  const projectedExpenses = projectedOtherExpenses + projectedCloudCosts + projectedRdSpend

  const projectedBurn = Math.round((projectedExpenses / 12) * 100) / 100
  const originalMonthlyBurn = baseline.expenses / 12
  const cashReserves = originalMonthlyBurn * baseline.runway
  const projectedRunway = projectedBurn > 0
    ? Math.round((cashReserves / projectedBurn) * 10) / 10
    : Infinity

  const projectedRdClaim = Math.round(projectedRdSpend * 0.435 * 100) / 100

  const baselineMargin = baseline.revenue > 0
    ? ((baseline.revenue - baseline.expenses) / baseline.revenue) * 100
    : 0
  const projectedMargin = projectedRevenue > 0
    ? ((projectedRevenue - projectedExpenses) / projectedRevenue) * 100
    : 0
  const marginImpact = Math.round((projectedMargin - baselineMargin) * 100) / 100

  return {
    projectedBurn,
    projectedRunway,
    projectedRdClaim,
    marginImpact,
    details: {
      projectedRevenue: Math.round(projectedRevenue * 100) / 100,
      projectedExpenses: Math.round(projectedExpenses * 100) / 100,
      projectedRdSpend: Math.round(projectedRdSpend * 100) / 100,
      projectedCloudCosts: Math.round(projectedCloudCosts * 100) / 100,
    },
  }
}

export default function ScenariosPage() {
  const [baseline, setBaseline] = useState({
    revenue: 500000,
    expenses: 400000,
    rdSpend: 150000,
    cloudCosts: 50000,
    runway: 18,
  })

  const [variables, setVariables] = useState({
    gpuCostChange: 0,
    trainingRunMultiplier: 0,
    revenueGrowth: 0,
    headcountChange: 0,
  })

  const [scenarioName, setScenarioName] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([])

  const result = runScenario(baseline, variables)

  useEffect(() => {
    fetch("/api/scenarios")
      .then((res) => res.ok ? res.json() : [])
      .then(setSavedScenarios)
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!scenarioName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scenarioName,
          baselineJson: baseline,
          variablesJson: variables,
          resultsJson: result,
        }),
      })
      if (res.ok) {
        const saved = await res.json()
        setSavedScenarios((prev) => [saved, ...prev])
        setScenarioName("")
      }
    } finally {
      setSaving(false)
    }
  }

  const sliderConfig = [
    { key: "gpuCostChange", label: "GPU/Cloud Cost Change", min: -50, max: 200, unit: "%", color: "indigo" },
    { key: "trainingRunMultiplier", label: "Training Run / R&D Multiplier", min: -50, max: 200, unit: "%", color: "violet" },
    { key: "revenueGrowth", label: "Revenue Growth", min: -50, max: 100, unit: "%", color: "emerald" },
    { key: "headcountChange", label: "Headcount / Overhead Change", min: -30, max: 100, unit: "%", color: "amber" },
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Scenario Simulator</h1>
        <p className="mt-1 text-sm text-slate-500">
          Model what-if scenarios to understand financial impact of R&D decisions
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input Panel */}
        <div className="space-y-6">
          {/* Baseline */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Baseline (Annual)</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {[
                { key: "revenue", label: "Revenue" },
                { key: "expenses", label: "Total Expenses" },
                { key: "rdSpend", label: "R&D Spend" },
                { key: "cloudCosts", label: "Cloud Costs" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input
                      type="number"
                      value={baseline[field.key as keyof typeof baseline]}
                      onChange={(e) =>
                        setBaseline((prev) => ({
                          ...prev,
                          [field.key]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Cash Runway (months)</label>
                <input
                  type="number"
                  value={baseline.runway}
                  onChange={(e) =>
                    setBaseline((prev) => ({ ...prev, runway: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Variables Sliders */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Scenario Variables</h2>
            <div className="mt-4 space-y-6">
              {sliderConfig.map((slider) => (
                <div key={slider.key}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">{slider.label}</label>
                    <span className={`text-sm font-bold tabular-nums ${
                      variables[slider.key] > 0 ? "text-rose-600" :
                      variables[slider.key] < 0 ? "text-emerald-600" : "text-slate-600"
                    }`}>
                      {variables[slider.key] > 0 ? "+" : ""}{variables[slider.key]}{slider.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={5}
                    value={variables[slider.key]}
                    onChange={(e) =>
                      setVariables((prev) => ({
                        ...prev,
                        [slider.key]: parseInt(e.target.value),
                      }))
                    }
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{slider.min}%</span>
                    <span>0%</span>
                    <span>+{slider.max}%</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setVariables({ gpuCostChange: 0, trainingRunMultiplier: 0, revenueGrowth: 0, headcountChange: 0 })}
              className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Reset to Baseline
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Projected Results</h2>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Monthly Burn</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(result.projectedBurn)}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Runway</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {result.projectedRunway === Infinity ? "Unlimited" : `${result.projectedRunway} months`}
                </p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">R&D Claim Estimate</p>
                <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(result.projectedRdClaim)}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Margin Impact</p>
                <p className={`mt-1 text-xl font-bold ${result.marginImpact >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {result.marginImpact >= 0 ? "+" : ""}{result.marginImpact}pp
                </p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Breakdown</h3>
              {[
                { label: "Projected Revenue", value: result.details.projectedRevenue, base: baseline.revenue },
                { label: "Projected Expenses", value: result.details.projectedExpenses, base: baseline.expenses },
                { label: "Projected R&D Spend", value: result.details.projectedRdSpend, base: baseline.rdSpend },
                { label: "Projected Cloud Costs", value: result.details.projectedCloudCosts, base: baseline.cloudCosts },
              ].map((item) => {
                const diff = item.value - item.base
                return (
                  <div key={item.label} className="flex items-center justify-between rounded-lg bg-white p-3">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(item.value)}</span>
                      {Math.abs(diff) > 0.01 && (
                        <span className={`ml-2 text-xs font-medium ${diff > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                          {diff > 0 ? "+" : ""}{formatCurrency(diff)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Save Scenario */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Save This Scenario</h3>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="Scenario name..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleSave}
                disabled={saving || !scenarioName.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {/* Saved Scenarios */}
          {savedScenarios.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Saved Scenarios</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {savedScenarios.slice(0, 5).map((s) => (
                  <Link
                    key={s.id}
                    href={`/scenarios/${s.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(s.createdAt).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
