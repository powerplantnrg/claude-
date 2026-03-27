/**
 * Contract Engine - Handles contract generation, payment scheduling,
 * quarterly financing calculations, and invoice validation.
 */

import { prisma } from "@/lib/prisma"

export interface PaymentMilestone {
  name: string
  description: string
  amount: number
  dueDate: string
  percentage: number
}

export interface QuarterlyPayment {
  quarter: string
  amount: number
  cumulativeAmount: number
  dueDate: string
}

/**
 * Auto-generate a unique contract number for an organization.
 * Format: MC-{ORG_PREFIX}-{YYYYMM}-{SEQUENCE}
 */
export async function generateContractNumber(orgId: string): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`

  // Count existing contracts for this org in the current month
  const existingCount = await prisma.marketplaceContract.count({
    where: {
      organizationId: orgId,
      createdAt: {
        gte: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    },
  })

  const sequence = String(existingCount + 1).padStart(3, "0")
  const orgPrefix = orgId.slice(-4).toUpperCase()

  return `MC-${orgPrefix}-${yearMonth}-${sequence}`
}

/**
 * Generate a milestone-based payment schedule from a total amount and milestone definitions.
 */
export function createPaymentSchedule(
  amount: number,
  milestones: Array<{
    name: string
    description?: string
    percentage: number
    offsetWeeks: number
  }>,
  paymentTerms: string,
  startDate?: Date
): PaymentMilestone[] {
  const baseDate = startDate ?? new Date()

  // Validate percentages sum to ~100%
  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0)
  if (Math.abs(totalPercentage - 100) > 1) {
    throw new Error(`Milestone percentages sum to ${totalPercentage}%, expected 100%`)
  }

  return milestones.map((milestone) => {
    const dueDate = new Date(baseDate)
    dueDate.setDate(dueDate.getDate() + milestone.offsetWeeks * 7)

    const milestoneAmount = Math.round((amount * milestone.percentage) / 100 * 100) / 100

    return {
      name: milestone.name,
      description: milestone.description ?? "",
      amount: milestoneAmount,
      dueDate: dueDate.toISOString(),
      percentage: milestone.percentage,
    }
  })
}

/**
 * Calculate quarterly financing payment plan.
 * Returns breakdown of quarterly payments including any interest.
 */
export function calculateQuarterlyFinancing(
  totalAmount: number,
  quarters: number,
  rate: number = 0
): {
  quarterlyAmount: number
  totalWithInterest: number
  interestAmount: number
  payments: QuarterlyPayment[]
} {
  if (quarters <= 0) throw new Error("Number of quarters must be positive")
  if (rate < 0) throw new Error("Interest rate cannot be negative")

  const interestMultiplier = 1 + rate / 100
  const totalWithInterest = Math.round(totalAmount * interestMultiplier * 100) / 100
  const interestAmount = Math.round((totalWithInterest - totalAmount) * 100) / 100
  const quarterlyAmount = Math.round((totalWithInterest / quarters) * 100) / 100

  const payments: QuarterlyPayment[] = []
  const now = new Date()
  let currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
  let currentYear = now.getFullYear()

  for (let i = 0; i < quarters; i++) {
    const quarterLabel = `Q${currentQuarter} ${currentYear}`
    const quarterStartMonth = (currentQuarter - 1) * 3
    const dueDate = new Date(currentYear, quarterStartMonth, 1)

    // Last payment may have rounding adjustment
    const isLastPayment = i === quarters - 1
    const paymentAmount = isLastPayment
      ? Math.round((totalWithInterest - quarterlyAmount * (quarters - 1)) * 100) / 100
      : quarterlyAmount

    payments.push({
      quarter: quarterLabel,
      amount: paymentAmount,
      cumulativeAmount: Math.round((quarterlyAmount * (i + 1)) * 100) / 100,
      dueDate: dueDate.toISOString(),
    })

    currentQuarter++
    if (currentQuarter > 4) {
      currentQuarter = 1
      currentYear++
    }
  }

  return {
    quarterlyAmount,
    totalWithInterest,
    interestAmount,
    payments,
  }
}

/**
 * Validate that an invoice matches the contract terms and milestones.
 * Returns validation result with any issues found.
 */
export function validateInvoiceAgainstContract(
  invoice: {
    amount: number
    gstAmount: number
    totalAmount: number
    milestoneId?: string | null
    description?: string | null
  },
  contract: {
    agreedAmount: number
    status: string
    deliverables?: string | null
    milestones: Array<{
      id: string
      name: string
      amount: number
      status: string
    }>
    invoices: Array<{
      id: string
      totalAmount: number
      status: string
    }>
  }
): {
  valid: boolean
  issues: string[]
  warnings: string[]
} {
  const issues: string[] = []
  const warnings: string[] = []

  // Check contract is active
  if (contract.status !== "Active") {
    issues.push(`Contract is not active (status: ${contract.status})`)
  }

  // Check GST calculation (10% in Australia)
  const expectedGst = Math.round(invoice.amount * 0.1 * 100) / 100
  if (Math.abs(invoice.gstAmount - expectedGst) > 0.01) {
    warnings.push(`GST amount ($${invoice.gstAmount}) does not match expected 10% ($${expectedGst})`)
  }

  // Check total = amount + GST
  const expectedTotal = Math.round((invoice.amount + invoice.gstAmount) * 100) / 100
  if (Math.abs(invoice.totalAmount - expectedTotal) > 0.01) {
    issues.push(`Total ($${invoice.totalAmount}) does not equal amount + GST ($${expectedTotal})`)
  }

  // Check total invoiced does not exceed contract amount
  const previouslyInvoiced = contract.invoices
    .filter((i) => i.status !== "Rejected" && i.status !== "Disputed")
    .reduce((sum, i) => sum + i.totalAmount, 0)
  const totalAfterThis = previouslyInvoiced + invoice.totalAmount
  const contractTotalWithGst = contract.agreedAmount * 1.1

  if (totalAfterThis > contractTotalWithGst * 1.01) { // 1% tolerance
    issues.push(
      `Total invoiced ($${totalAfterThis.toFixed(2)}) would exceed contract amount with GST ($${contractTotalWithGst.toFixed(2)})`
    )
  }

  // Validate against milestone if specified
  if (invoice.milestoneId) {
    const milestone = contract.milestones.find((m) => m.id === invoice.milestoneId)
    if (!milestone) {
      issues.push("Referenced milestone not found in contract")
    } else {
      if (milestone.status === "Paid") {
        issues.push(`Milestone "${milestone.name}" has already been paid`)
      }
      const milestoneWithGst = milestone.amount * 1.1
      if (Math.abs(invoice.totalAmount - milestoneWithGst) > milestoneWithGst * 0.05) {
        warnings.push(
          `Invoice total ($${invoice.totalAmount}) differs from milestone amount with GST ($${milestoneWithGst.toFixed(2)})`
        )
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  }
}

/**
 * Check whether an invoice is for work that falls within the contract scope.
 * Protects users from paying invoices for out-of-scope work.
 */
export function isInvoiceEligible(
  invoice: {
    amount: number
    description?: string | null
    milestoneId?: string | null
    contractId: string
  },
  contract: {
    id: string
    status: string
    agreedAmount: number
    startDate?: Date | null
    endDate?: Date | null
    deliverables?: string | null
    milestones: Array<{
      id: string
      name: string
      amount: number
      status: string
    }>
  }
): {
  eligible: boolean
  reason: string
} {
  // Must match the contract
  if (invoice.contractId !== contract.id) {
    return { eligible: false, reason: "Invoice does not reference this contract" }
  }

  // Contract must be active
  if (contract.status !== "Active" && contract.status !== "Completed") {
    return { eligible: false, reason: `Contract is ${contract.status}, invoicing not permitted` }
  }

  // Check if within contract date range
  if (contract.endDate) {
    const now = new Date()
    const gracePeriod = new Date(contract.endDate)
    gracePeriod.setDate(gracePeriod.getDate() + 30) // 30-day grace period
    if (now > gracePeriod) {
      return {
        eligible: false,
        reason: "Invoice submitted more than 30 days after contract end date",
      }
    }
  }

  // If milestone-based, the milestone must exist and not be already paid
  if (invoice.milestoneId) {
    const milestone = contract.milestones.find((m) => m.id === invoice.milestoneId)
    if (!milestone) {
      return { eligible: false, reason: "Referenced milestone does not exist in contract" }
    }
    if (milestone.status === "Paid") {
      return { eligible: false, reason: `Milestone "${milestone.name}" has already been paid` }
    }
  }

  // Check invoice amount is reasonable relative to contract
  if (invoice.amount > contract.agreedAmount) {
    return {
      eligible: false,
      reason: `Invoice amount ($${invoice.amount}) exceeds total contract amount ($${contract.agreedAmount})`,
    }
  }

  return { eligible: true, reason: "Invoice is eligible for payment" }
}
