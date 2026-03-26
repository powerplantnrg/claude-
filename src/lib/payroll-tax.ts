/**
 * Australian payroll tax calculation functions (2025-26 financial year)
 */

interface PAYGResult {
  incomeTax: number
  medicareLevy: number
  helpRepayment: number
  sfssRepayment: number
  totalTax: number
}

/**
 * Calculate PAYG withholding for an employee based on annual income.
 *
 * 2025-26 tax brackets:
 *   $0 - $18,200       Nil
 *   $18,201 - $45,000  16c per $1 over $18,200
 *   $45,001 - $135,000 30c per $1 over $45,000
 *   $135,001 - $190,000 37c per $1 over $135,000
 *   $190,001+          45c per $1 over $190,000
 */
export function calculatePAYG(
  annualIncome: number,
  residencyStatus: "resident" | "foreign" | "working-holiday" = "resident",
  taxFreeThreshold: boolean = true,
  helpDebt: boolean = false,
  sfssDebt: boolean = false,
  medicareLevyExemption: boolean = false
): PAYGResult {
  const incomeTax = calculateIncomeTax(annualIncome, residencyStatus, taxFreeThreshold)
  const medicareLevy = medicareLevyExemption
    ? 0
    : calculateMedicareLevy(annualIncome, residencyStatus)
  const helpRepayment = helpDebt ? calculateHELPRepayment(annualIncome) : 0
  const sfssRepayment = sfssDebt ? calculateSFSSRepayment(annualIncome) : 0

  return {
    incomeTax: round(incomeTax),
    medicareLevy: round(medicareLevy),
    helpRepayment: round(helpRepayment),
    sfssRepayment: round(sfssRepayment),
    totalTax: round(incomeTax + medicareLevy + helpRepayment + sfssRepayment),
  }
}

function calculateIncomeTax(
  annualIncome: number,
  residencyStatus: string,
  taxFreeThreshold: boolean
): number {
  if (annualIncome <= 0) return 0

  if (residencyStatus === "foreign") {
    return calculateForeignResidentTax(annualIncome)
  }

  if (!taxFreeThreshold) {
    // No tax-free threshold claimed — flat 16% on first $45,000 then normal brackets
    return calculateNoTaxFreeThreshold(annualIncome)
  }

  // Resident with tax-free threshold — 2025-26 brackets
  if (annualIncome <= 18200) return 0
  if (annualIncome <= 45000) return (annualIncome - 18200) * 0.16
  if (annualIncome <= 135000) return 4288 + (annualIncome - 45000) * 0.30
  if (annualIncome <= 190000) return 31288 + (annualIncome - 135000) * 0.37
  return 51638 + (annualIncome - 190000) * 0.45
}

function calculateForeignResidentTax(annualIncome: number): number {
  if (annualIncome <= 0) return 0
  if (annualIncome <= 45000) return annualIncome * 0.16
  if (annualIncome <= 135000) return 7200 + (annualIncome - 45000) * 0.30
  if (annualIncome <= 190000) return 34200 + (annualIncome - 135000) * 0.37
  return 54550 + (annualIncome - 190000) * 0.45
}

function calculateNoTaxFreeThreshold(annualIncome: number): number {
  if (annualIncome <= 0) return 0
  if (annualIncome <= 45000) return annualIncome * 0.16
  if (annualIncome <= 135000) return 7200 + (annualIncome - 45000) * 0.30
  if (annualIncome <= 190000) return 34200 + (annualIncome - 135000) * 0.37
  return 54550 + (annualIncome - 190000) * 0.45
}

/**
 * Medicare levy: 2% of taxable income
 * Low-income exemption: nil below $26,000
 * Shade-in: between $26,000 and $32,500 — 10% of excess over $26,000
 */
function calculateMedicareLevy(annualIncome: number, residencyStatus: string): number {
  if (residencyStatus === "foreign") return 0
  if (annualIncome <= 26000) return 0

  const fullLevy = annualIncome * 0.02
  if (annualIncome <= 32500) {
    // Shade-in: 10% of excess over $26,000
    const shadeIn = (annualIncome - 26000) * 0.10
    return Math.min(shadeIn, fullLevy)
  }
  return fullLevy
}

/**
 * HELP (HECS) repayment thresholds 2025-26
 */
function calculateHELPRepayment(annualIncome: number): number {
  const thresholds = [
    { min: 0, max: 54435, rate: 0 },
    { min: 54435, max: 62850, rate: 0.01 },
    { min: 62850, max: 66620, rate: 0.02 },
    { min: 66620, max: 70618, rate: 0.025 },
    { min: 70618, max: 74855, rate: 0.03 },
    { min: 74855, max: 79346, rate: 0.035 },
    { min: 79346, max: 84107, rate: 0.04 },
    { min: 84107, max: 89154, rate: 0.045 },
    { min: 89154, max: 94503, rate: 0.05 },
    { min: 94503, max: 100174, rate: 0.055 },
    { min: 100174, max: 106185, rate: 0.06 },
    { min: 106185, max: 112556, rate: 0.065 },
    { min: 112556, max: 119309, rate: 0.07 },
    { min: 119309, max: 126468, rate: 0.075 },
    { min: 126468, max: 134056, rate: 0.08 },
    { min: 134056, max: 142100, rate: 0.085 },
    { min: 142100, max: 150626, rate: 0.09 },
    { min: 150626, max: 151201, rate: 0.095 },
    { min: 151201, max: Infinity, rate: 0.10 },
  ]

  for (const bracket of thresholds) {
    if (annualIncome <= bracket.max) {
      return annualIncome * bracket.rate
    }
  }
  return annualIncome * 0.10
}

/**
 * SFSS (Student Financial Supplement Scheme) repayment
 * Uses same thresholds as HELP but at lower rates (roughly half)
 */
function calculateSFSSRepayment(annualIncome: number): number {
  if (annualIncome < 54435) return 0
  if (annualIncome < 62850) return annualIncome * 0.005
  if (annualIncome < 74855) return annualIncome * 0.01
  if (annualIncome < 89154) return annualIncome * 0.015
  if (annualIncome < 106185) return annualIncome * 0.02
  return annualIncome * 0.025
}

/**
 * Calculate superannuation guarantee (SG) contribution.
 * Current SG rate for 2025-26: 11.5%
 */
export function calculateSuperannuation(
  ordinaryTimeEarnings: number,
  rate: number = 0.115
): number {
  return round(ordinaryTimeEarnings * rate)
}

/**
 * Calculate Fringe Benefits Tax.
 * FBT rate for 2025-26: 47%
 * Grossed-up value = grossValue * (1 / (1 - FBT rate)) for Type 1 benefits
 */
export function calculateFBT(
  grossValue: number,
  exemptAmount: number = 0,
  rate: number = 0.47
): { taxableValue: number; fbtPayable: number; grossedUpValue: number } {
  const taxableValue = Math.max(0, grossValue - exemptAmount)
  // Type 1 gross-up factor (where GST credits are available)
  const grossUpFactor = 1 / (1 - rate)
  const grossedUpValue = round(taxableValue * grossUpFactor)
  const fbtPayable = round(grossedUpValue * rate)

  return { taxableValue: round(taxableValue), fbtPayable, grossedUpValue }
}

/**
 * Calculate novated lease salary sacrifice savings.
 * Shows comparison of tax paid with and without the pre-tax deduction.
 */
export function calculateNovatedLeaseSavings(
  annualSalary: number,
  preTaxDeduction: number,
  postTaxDeduction: number
): {
  withoutLease: { grossIncome: number; tax: number; netIncome: number; leaseFromNet: number; remainingIncome: number }
  withLease: { grossIncome: number; preTaxDeduction: number; taxableIncome: number; tax: number; netIncome: number; postTaxDeduction: number; remainingIncome: number }
  annualSavings: number
  monthlySavings: number
} {
  // Without novated lease
  const withoutTax = calculatePAYG(annualSalary)
  const withoutNet = annualSalary - withoutTax.totalTax
  const totalLeasePayment = preTaxDeduction + postTaxDeduction
  const withoutRemaining = withoutNet - totalLeasePayment

  // With novated lease (pre-tax portion reduces taxable income)
  const reducedIncome = annualSalary - preTaxDeduction
  const withTax = calculatePAYG(reducedIncome)
  const withNet = reducedIncome - withTax.totalTax
  const withRemaining = withNet - postTaxDeduction

  const annualSavings = withRemaining - withoutRemaining

  return {
    withoutLease: {
      grossIncome: annualSalary,
      tax: withoutTax.totalTax,
      netIncome: withoutNet,
      leaseFromNet: totalLeasePayment,
      remainingIncome: round(withoutRemaining),
    },
    withLease: {
      grossIncome: annualSalary,
      preTaxDeduction,
      taxableIncome: reducedIncome,
      tax: withTax.totalTax,
      netIncome: round(withNet),
      postTaxDeduction,
      remainingIncome: round(withRemaining),
    },
    annualSavings: round(annualSavings),
    monthlySavings: round(annualSavings / 12),
  }
}

interface EmployeeForStrategy {
  annualSalary: number
  employmentType: string
  superRate?: number
  hasHELPDebt?: boolean
  hasNovatedLease?: boolean
}

interface TaxStrategy {
  strategy: string
  description: string
  estimatedAnnualSavings: number
  category: string
  applicability: string
}

/**
 * Suggest applicable tax minimisation strategies for an employee.
 */
export function suggestTaxStrategies(
  employee: EmployeeForStrategy,
  currentDeductions: { salarySacrificeSuper?: number; novatedLeasePreTax?: number } = {}
): TaxStrategy[] {
  const strategies: TaxStrategy[] = []
  const salary = employee.annualSalary

  // Strategy 1: Salary sacrifice to super
  if (salary > 45000 && (!currentDeductions.salarySacrificeSuper || currentDeductions.salarySacrificeSuper < 10000)) {
    const sacrificeAmount = Math.min(10000, salary * 0.05)
    const currentTax = calculatePAYG(salary).totalTax
    const reducedTax = calculatePAYG(salary - sacrificeAmount).totalTax
    const taxSaving = currentTax - reducedTax
    // Super is taxed at 15% on the way in
    const superTax = sacrificeAmount * 0.15
    const netSaving = taxSaving - superTax

    strategies.push({
      strategy: "Salary Sacrifice to Superannuation",
      description: `Sacrifice $${sacrificeAmount.toLocaleString()} pre-tax to super. Marginal tax saving offset by 15% contributions tax.`,
      estimatedAnnualSavings: round(netSaving),
      category: "Superannuation",
      applicability: "All permanent employees earning above $45,000",
    })
  }

  // Strategy 2: Novated lease
  if (salary > 60000 && !employee.hasNovatedLease) {
    const annualPreTax = 12000
    const annualPostTax = 4000
    const savings = calculateNovatedLeaseSavings(salary, annualPreTax, annualPostTax)

    strategies.push({
      strategy: "Novated Lease",
      description: `Enter a novated lease arrangement with estimated pre-tax deduction of $${annualPreTax.toLocaleString()}/year. Income tax reduction through salary packaging.`,
      estimatedAnnualSavings: savings.annualSavings,
      category: "Salary Packaging",
      applicability: "Employees earning above $60,000 who require a vehicle",
    })
  }

  // Strategy 3: Work from home deductions (R&D specific)
  if (employee.employmentType === "Full-time" || employee.employmentType === "Part-time") {
    const wfhSaving = round(salary > 100000 ? 1200 : 800)
    strategies.push({
      strategy: "Work From Home Deductions",
      description: "Claim fixed-rate method of 67c per hour for work from home expenses including electricity, phone, internet, stationery.",
      estimatedAnnualSavings: wfhSaving,
      category: "Deductions",
      applicability: "Employees who work from home regularly",
    })
  }

  // Strategy 4: Additional super contributions for high earners
  if (salary > 135000) {
    const maxConcessional = 30000
    const sgContribution = salary * (employee.superRate || 0.115)
    const headroom = maxConcessional - sgContribution
    if (headroom > 0) {
      const currentTax = calculatePAYG(salary).totalTax
      const reducedTax = calculatePAYG(salary - headroom).totalTax
      const taxSaving = currentTax - reducedTax
      const superTax = headroom * 0.15
      strategies.push({
        strategy: "Maximise Concessional Super Contributions",
        description: `You have $${round(headroom).toLocaleString()} of unused concessional cap. Contribute additional to reduce taxable income.`,
        estimatedAnnualSavings: round(taxSaving - superTax),
        category: "Superannuation",
        applicability: "High-income employees with unused concessional cap",
      })
    }
  }

  // Strategy 5: HELP debt management
  if (employee.hasHELPDebt && salary > 54435) {
    const helpRepayment = calculatePAYG(salary, "resident", true, true, false, false).helpRepayment
    // Check if salary sacrifice could drop below a threshold
    const thresholds = [54435, 62850, 66620, 70618, 74855]
    for (const threshold of thresholds) {
      if (salary > threshold && salary <= threshold + 5000) {
        const reductionNeeded = salary - threshold + 1
        strategies.push({
          strategy: "HELP Debt Threshold Management",
          description: `Your income is just above the $${threshold.toLocaleString()} HELP threshold. A salary sacrifice of $${round(reductionNeeded).toLocaleString()} could reduce your HELP repayment rate.`,
          estimatedAnnualSavings: round(helpRepayment * 0.3),
          category: "Debt Management",
          applicability: "Employees with HELP debt near repayment thresholds",
        })
        break
      }
    }
  }

  return strategies
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
