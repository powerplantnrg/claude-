import type { RdClassification } from "@/types"

export interface TransactionForClassification {
  accountCode: string
  description: string
  contactIsRdContractor: boolean
  isRdAccount: boolean
}

const CORE_RD_KEYWORDS = [
  "experiment",
  "hypothesis",
  "prototype",
  "research",
  "model training",
  "novel",
  "unknown outcome",
  "technical uncertainty",
  "systematic investigation",
  "new knowledge",
  "testing hypothesis",
  "experimental development",
] as const

const SUPPORTING_RD_KEYWORDS = [
  "data collection",
  "data cleaning",
  "literature review",
  "calibration",
  "tooling",
  "test environment",
  "lab supplies",
  "cloud compute",
  "gpu",
  "training infrastructure",
  "dataset",
  "annotation",
  "labelling",
] as const

const NON_ELIGIBLE_KEYWORDS = [
  "marketing",
  "sales",
  "entertainment",
  "dividend",
  "distribution",
  "capital raise",
  "fundraising",
  "legal fee",
  "accounting fee",
  "office supplies",
  "rent",
  "insurance",
] as const

/**
 * Classifies a transaction for R&D Tax Incentive eligibility.
 *
 * Classification logic:
 * 1. If description matches non-eligible keywords, classify as NonEligible.
 * 2. If description matches core R&D keywords, classify as CoreRD.
 * 3. If description matches supporting R&D keywords, classify as SupportingRD.
 * 4. If the account is flagged as R&D-eligible, classify as NeedsReview.
 * 5. If the contact is an R&D contractor, classify as NeedsReview.
 * 6. Otherwise, classify as NonEligible.
 */
export function classifyTransaction(
  transaction: TransactionForClassification
): RdClassification {
  const desc = transaction.description.toLowerCase()

  // Check non-eligible keywords first to exclude obvious non-R&D expenses
  if (matchesAny(desc, NON_ELIGIBLE_KEYWORDS)) {
    return "NonEligible"
  }

  // Check for core R&D activity keywords
  if (matchesAny(desc, CORE_RD_KEYWORDS)) {
    return "CoreRD"
  }

  // Check for supporting R&D activity keywords
  if (matchesAny(desc, SUPPORTING_RD_KEYWORDS)) {
    return "SupportingRD"
  }

  // If the account is flagged as R&D, needs manual confirmation
  if (transaction.isRdAccount) {
    return "NeedsReview"
  }

  // If the contact is an R&D contractor, needs manual confirmation
  if (transaction.contactIsRdContractor) {
    return "NeedsReview"
  }

  return "NonEligible"
}

/**
 * Returns a human-readable label for a classification.
 */
export function classificationLabel(classification: RdClassification): string {
  switch (classification) {
    case "CoreRD":
      return "Core R&D"
    case "SupportingRD":
      return "Supporting R&D"
    case "NonEligible":
      return "Not Eligible"
    case "NeedsReview":
      return "Needs Review"
  }
}

/**
 * Returns a suggested badge colour for a classification.
 */
export function classificationColor(
  classification: RdClassification
): string {
  switch (classification) {
    case "CoreRD":
      return "green"
    case "SupportingRD":
      return "blue"
    case "NonEligible":
      return "gray"
    case "NeedsReview":
      return "yellow"
  }
}

function matchesAny(
  text: string,
  keywords: readonly string[]
): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}
