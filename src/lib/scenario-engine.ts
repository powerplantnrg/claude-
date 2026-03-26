export interface ScenarioBaseline {
  revenue: number
  expenses: number
  rdSpend: number
  cloudCosts: number
  runway: number // months
}

export interface ScenarioResult {
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

/**
 * Well-known scenario variable names and their effects:
 * - gpuCostChange: percentage change in cloud/GPU costs (e.g., 20 = +20%)
 * - trainingRunMultiplier: multiplier applied to R&D spend (e.g., 50 = +50%)
 * - revenueGrowth: percentage change in revenue (e.g., 10 = +10%)
 * - headcountChange: percentage change in non-cloud expenses (e.g., 15 = +15%)
 */

const REFUNDABLE_OFFSET_RATE = 0.435

/**
 * Runs a what-if scenario by applying percentage changes to a baseline
 * and returning the projected financial impacts.
 *
 * Each variable value represents a percentage change (e.g., 20 means +20%).
 */
export function runScenario(
  baseline: ScenarioBaseline,
  variables: Record<string, number>
): ScenarioResult {
  const gpuCostChange = variables.gpuCostChange ?? 0
  const trainingRunMultiplier = variables.trainingRunMultiplier ?? 0
  const revenueGrowth = variables.revenueGrowth ?? 0
  const headcountChange = variables.headcountChange ?? 0

  // Project revenue
  const projectedRevenue = applyPercentage(baseline.revenue, revenueGrowth)

  // Project cloud costs separately since they have their own variable
  const projectedCloudCosts = applyPercentage(baseline.cloudCosts, gpuCostChange)

  // Project R&D spend with training run multiplier
  const projectedRdSpend = applyPercentage(baseline.rdSpend, trainingRunMultiplier)

  // Non-R&D, non-cloud expenses affected by headcount
  const otherExpenses = baseline.expenses - baseline.cloudCosts - baseline.rdSpend
  const projectedOtherExpenses = applyPercentage(otherExpenses, headcountChange)

  // Total projected expenses
  const projectedExpenses = projectedOtherExpenses + projectedCloudCosts + projectedRdSpend

  // Monthly burn rate
  const projectedBurn = round(projectedExpenses / 12, 2)

  // Runway in months (assuming baseline.runway was based on original burn)
  const originalMonthlyBurn = baseline.expenses / 12
  const cashReserves = originalMonthlyBurn * baseline.runway
  const projectedRunway =
    projectedBurn > 0 ? round(cashReserves / projectedBurn, 1) : Infinity

  // Estimated R&D claim using the refundable offset rate
  const projectedRdClaim = round(projectedRdSpend * REFUNDABLE_OFFSET_RATE, 2)

  // Margin impact: change in profit margin percentage points
  const baselineMargin =
    baseline.revenue > 0
      ? ((baseline.revenue - baseline.expenses) / baseline.revenue) * 100
      : 0
  const projectedMargin =
    projectedRevenue > 0
      ? ((projectedRevenue - projectedExpenses) / projectedRevenue) * 100
      : 0
  const marginImpact = round(projectedMargin - baselineMargin, 2)

  return {
    projectedBurn,
    projectedRunway,
    projectedRdClaim,
    marginImpact,
    details: {
      projectedRevenue,
      projectedExpenses,
      projectedRdSpend,
      projectedCloudCosts,
    },
  }
}

function applyPercentage(base: number, percentChange: number): number {
  return round(base * (1 + percentChange / 100), 2)
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
