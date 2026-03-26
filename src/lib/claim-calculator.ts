export interface RdClaimResult {
  offsetRate: number
  estimatedOffset: number
  isRefundable: boolean
}

export interface ClaimBreakdownItem {
  category: string
  amount: number
  percentage: number
}

export interface ClaimBreakdown {
  items: ClaimBreakdownItem[]
  totalEligible: number
}

const TURNOVER_THRESHOLD = 20_000_000
const REFUNDABLE_OFFSET_RATE = 0.435
const NON_REFUNDABLE_OFFSET_RATE = 0.385
const COMPANY_TAX_RATE = 0.25

/**
 * Calculates the R&D Tax Incentive claim based on Australian tax rules.
 *
 * - Entities with aggregated turnover under $20M receive a 43.5% refundable tax offset.
 * - Entities with turnover of $20M or more receive a 38.5% non-refundable tax offset,
 *   capped at the company tax rate of 25%.
 */
export function calculateRdClaim(
  totalEligibleExpenditure: number,
  aggregatedTurnover: number
): RdClaimResult {
  const isRefundable = aggregatedTurnover < TURNOVER_THRESHOLD

  if (isRefundable) {
    const estimatedOffset = round(
      totalEligibleExpenditure * REFUNDABLE_OFFSET_RATE,
      2
    )
    return {
      offsetRate: REFUNDABLE_OFFSET_RATE,
      estimatedOffset,
      isRefundable: true,
    }
  }

  // Non-refundable offset: the incremental benefit above the company tax rate
  const incrementalRate = NON_REFUNDABLE_OFFSET_RATE - COMPANY_TAX_RATE
  const estimatedOffset = round(
    totalEligibleExpenditure * incrementalRate,
    2
  )

  return {
    offsetRate: NON_REFUNDABLE_OFFSET_RATE,
    estimatedOffset,
    isRefundable: false,
  }
}

/**
 * Groups expenses by category and returns a breakdown with percentages.
 */
export function generateClaimBreakdown(
  expenses: { category: string; amount: number }[]
): ClaimBreakdown {
  const grouped = new Map<string, number>()

  for (const expense of expenses) {
    const current = grouped.get(expense.category) ?? 0
    grouped.set(expense.category, current + expense.amount)
  }

  const totalEligible = Array.from(grouped.values()).reduce(
    (sum, amount) => sum + amount,
    0
  )

  const items: ClaimBreakdownItem[] = Array.from(grouped.entries())
    .map(([category, amount]) => ({
      category,
      amount: round(amount, 2),
      percentage:
        totalEligible > 0 ? round((amount / totalEligible) * 100, 2) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  return {
    items,
    totalEligible: round(totalEligible, 2),
  }
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
