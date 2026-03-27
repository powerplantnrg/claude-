/**
 * Loan calculation utilities: amortization schedules, EMI, balance, total interest.
 */

export interface AmortizationRow {
  month: number
  date: Date
  payment: number
  principalPortion: number
  interestPortion: number
  balance: number
}

/**
 * Calculate the monthly payment (EMI) for a loan.
 * Uses standard annuity formula: P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (termMonths <= 0) return 0
  if (annualRate <= 0) return principal / termMonths

  const monthlyRate = annualRate / 100 / 12
  const factor = Math.pow(1 + monthlyRate, termMonths)
  const payment = principal * (monthlyRate * factor) / (factor - 1)

  return Math.round(payment * 100) / 100
}

/**
 * Generate a full amortization schedule for a loan.
 */
export function calculateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  startDate: Date
): AmortizationRow[] {
  const schedule: AmortizationRow[] = []
  const monthlyPayment = calculateMonthlyPayment(
    principal,
    annualRate,
    termMonths
  )
  const monthlyRate = annualRate / 100 / 12

  let balance = principal

  for (let month = 1; month <= termMonths; month++) {
    const interestPortion =
      Math.round(balance * monthlyRate * 100) / 100
    const principalPortion =
      month === termMonths
        ? balance // Last payment clears the balance
        : Math.round((monthlyPayment - interestPortion) * 100) / 100

    const payment =
      month === termMonths
        ? Math.round((principalPortion + interestPortion) * 100) / 100
        : monthlyPayment

    balance = Math.max(
      0,
      Math.round((balance - principalPortion) * 100) / 100
    )

    const date = new Date(startDate)
    date.setMonth(date.getMonth() + month)

    schedule.push({
      month,
      date,
      payment,
      principalPortion,
      interestPortion,
      balance,
    })
  }

  return schedule
}

/**
 * Calculate the remaining balance of a loan as of a given date.
 * Determines how many payments have been made based on the start date,
 * then computes the outstanding principal.
 */
export function calculateRemainingBalance(
  loan: {
    principalAmount: number
    interestRate: number
    termMonths: number
    startDate: Date
  },
  asOfDate: Date
): number {
  const { principalAmount, interestRate, termMonths, startDate } = loan

  // Calculate months elapsed
  const start = new Date(startDate)
  const asOf = new Date(asOfDate)
  const monthsElapsed =
    (asOf.getFullYear() - start.getFullYear()) * 12 +
    (asOf.getMonth() - start.getMonth())

  if (monthsElapsed <= 0) return principalAmount
  if (monthsElapsed >= termMonths) return 0

  if (interestRate <= 0) {
    // Simple interest-free: proportional reduction
    const monthlyPrincipal = principalAmount / termMonths
    return Math.round((principalAmount - monthlyPrincipal * monthsElapsed) * 100) / 100
  }

  const monthlyRate = interestRate / 100 / 12

  // Remaining balance formula: P * [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
  const factor_n = Math.pow(1 + monthlyRate, termMonths)
  const factor_p = Math.pow(1 + monthlyRate, monthsElapsed)
  const balance = principalAmount * (factor_n - factor_p) / (factor_n - 1)

  return Math.round(balance * 100) / 100
}

/**
 * Calculate the total interest paid over the life of the loan.
 */
export function calculateTotalInterest(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  const monthlyPayment = calculateMonthlyPayment(
    principal,
    annualRate,
    termMonths
  )
  const totalPaid = monthlyPayment * termMonths
  const totalInterest = totalPaid - principal

  return Math.round(totalInterest * 100) / 100
}
