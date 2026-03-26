/**
 * Financial forecasting utilities.
 *
 * Provides linear-regression revenue projection, moving-average expense
 * projection, and a running-balance cash-flow projection.
 */

/**
 * Project revenue using simple linear regression on historical monthly data.
 * Returns an array of `months` projected values.
 */
export function projectRevenue(
  historicalMonths: number[],
  months: number
): number[] {
  const n = historicalMonths.length
  if (n === 0) return Array(months).fill(0)
  if (n === 1) return Array(months).fill(historicalMonths[0])

  // Simple linear regression: y = a + b*x
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += historicalMonths[i]
    sumXY += i * historicalMonths[i]
    sumX2 += i * i
  }

  const denominator = n * sumX2 - sumX * sumX
  const b = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
  const a = (sumY - b * sumX) / n

  const projections: number[] = []
  for (let i = 0; i < months; i++) {
    const value = a + b * (n + i)
    projections.push(Math.max(0, Math.round(value * 100) / 100))
  }

  return projections
}

/**
 * Project expenses using a moving average of the most recent historical months.
 * Uses the average of the provided data and returns `months` projected values.
 */
export function projectExpenses(
  historicalMonths: number[],
  months: number
): number[] {
  const n = historicalMonths.length
  if (n === 0) return Array(months).fill(0)

  const avg = historicalMonths.reduce((sum, val) => sum + val, 0) / n
  const rounded = Math.round(avg * 100) / 100

  return Array(months).fill(rounded)
}

/**
 * Project cash flow as a running balance starting from `startingBalance`,
 * adding each month's revenue and subtracting expenses.
 */
export function projectCashFlow(
  startingBalance: number,
  revenues: number[],
  expenses: number[]
): number[] {
  const months = Math.max(revenues.length, expenses.length)
  const balances: number[] = []
  let balance = startingBalance

  for (let i = 0; i < months; i++) {
    const rev = revenues[i] ?? 0
    const exp = expenses[i] ?? 0
    balance = Math.round((balance + rev - exp) * 100) / 100
    balances.push(balance)
  }

  return balances
}
