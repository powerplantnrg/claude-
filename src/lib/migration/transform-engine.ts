/**
 * Migration Transform Engine
 * Handles account mapping, contact deduplication, code/tax transformations,
 * duplicate detection, and opening balance generation.
 */

import { prisma } from "@/lib/prisma"

// ============================================
// Types
// ============================================

export interface SourceAccount {
  code: string
  name: string
  type: string
  taxType?: string
  balance?: number
}

export interface TargetAccount {
  id: string
  code: string
  name: string
  type: string
  subType?: string
}

export interface AccountMappingResult {
  sourceCode: string
  sourceName: string
  sourceType: string
  targetId: string | null
  targetCode: string | null
  targetName: string | null
  confidence: number // 0-1
  matchMethod: string // exact_code, exact_name, fuzzy_name, type_match, manual
  requiresReview: boolean
}

export interface SourceContact {
  id?: string
  name: string
  email?: string
  phone?: string
  abn?: string
  contactType?: string
}

export interface ContactMappingResult {
  sourceName: string
  sourceEmail?: string
  targetId: string | null
  targetName: string | null
  confidence: number
  matchMethod: string
  isDuplicate: boolean
  requiresReview: boolean
}

export interface MigrationRuleInput {
  entityType: string
  sourceField: string
  sourceValue: string
  targetField: string
  targetValue: string
  ruleType: string
  priority: number
}

export interface DuplicateResult {
  sourceId: string
  sourceName: string
  existingId: string
  existingName: string
  confidence: number
  matchFields: string[]
}

// ============================================
// Account Mapping
// ============================================

/**
 * Auto-map source accounts to target chart of accounts using
 * name matching, type matching, and code range heuristics.
 */
export function createAccountMapping(
  sourceAccounts: SourceAccount[],
  targetChartOfAccounts: TargetAccount[],
  rules: MigrationRuleInput[]
): AccountMappingResult[] {
  const results: AccountMappingResult[] = []

  for (const source of sourceAccounts) {
    // Check explicit rules first
    const rule = rules
      .filter(
        (r) =>
          r.entityType === "Account" &&
          r.sourceField === "code" &&
          r.sourceValue === source.code
      )
      .sort((a, b) => b.priority - a.priority)[0]

    if (rule) {
      const target = targetChartOfAccounts.find(
        (t) => t.code === rule.targetValue || t.id === rule.targetValue
      )
      results.push({
        sourceCode: source.code,
        sourceName: source.name,
        sourceType: source.type,
        targetId: target?.id ?? null,
        targetCode: target?.code ?? null,
        targetName: target?.name ?? null,
        confidence: 1.0,
        matchMethod: "rule",
        requiresReview: false,
      })
      continue
    }

    // Try exact code match
    const codeMatch = targetChartOfAccounts.find(
      (t) => t.code === source.code
    )
    if (codeMatch) {
      results.push({
        sourceCode: source.code,
        sourceName: source.name,
        sourceType: source.type,
        targetId: codeMatch.id,
        targetCode: codeMatch.code,
        targetName: codeMatch.name,
        confidence: 0.95,
        matchMethod: "exact_code",
        requiresReview: false,
      })
      continue
    }

    // Try exact name match
    const nameMatch = targetChartOfAccounts.find(
      (t) => t.name.toLowerCase() === source.name.toLowerCase()
    )
    if (nameMatch) {
      results.push({
        sourceCode: source.code,
        sourceName: source.name,
        sourceType: source.type,
        targetId: nameMatch.id,
        targetCode: nameMatch.code,
        targetName: nameMatch.name,
        confidence: 0.9,
        matchMethod: "exact_name",
        requiresReview: false,
      })
      continue
    }

    // Try fuzzy name match
    const fuzzyMatch = findBestFuzzyMatch(source.name, targetChartOfAccounts)
    if (fuzzyMatch && fuzzyMatch.score >= 0.7) {
      results.push({
        sourceCode: source.code,
        sourceName: source.name,
        sourceType: source.type,
        targetId: fuzzyMatch.account.id,
        targetCode: fuzzyMatch.account.code,
        targetName: fuzzyMatch.account.name,
        confidence: fuzzyMatch.score,
        matchMethod: "fuzzy_name",
        requiresReview: fuzzyMatch.score < 0.85,
      })
      continue
    }

    // Try type-based matching with code range heuristics
    const typeMatch = findTypeMatch(source, targetChartOfAccounts)
    if (typeMatch) {
      results.push({
        sourceCode: source.code,
        sourceName: source.name,
        sourceType: source.type,
        targetId: typeMatch.id,
        targetCode: typeMatch.code,
        targetName: typeMatch.name,
        confidence: 0.5,
        matchMethod: "type_match",
        requiresReview: true,
      })
      continue
    }

    // No match found
    results.push({
      sourceCode: source.code,
      sourceName: source.name,
      sourceType: source.type,
      targetId: null,
      targetCode: null,
      targetName: null,
      confidence: 0,
      matchMethod: "none",
      requiresReview: true,
    })
  }

  return results
}

// ============================================
// Contact Mapping
// ============================================

/**
 * Deduplicate and map contacts, flagging conflicts.
 */
export function createContactMapping(
  sourceContacts: SourceContact[],
  existingContacts: SourceContact[]
): ContactMappingResult[] {
  const results: ContactMappingResult[] = []

  for (const source of sourceContacts) {
    // Try exact email match
    if (source.email) {
      const emailMatch = existingContacts.find(
        (c) =>
          c.email &&
          c.email.toLowerCase() === source.email!.toLowerCase()
      )
      if (emailMatch) {
        results.push({
          sourceName: source.name,
          sourceEmail: source.email,
          targetId: emailMatch.id ?? null,
          targetName: emailMatch.name,
          confidence: 0.95,
          matchMethod: "exact_email",
          isDuplicate: true,
          requiresReview: false,
        })
        continue
      }
    }

    // Try ABN match
    if (source.abn) {
      const abnMatch = existingContacts.find(
        (c) => c.abn && c.abn.replace(/\s/g, "") === source.abn!.replace(/\s/g, "")
      )
      if (abnMatch) {
        results.push({
          sourceName: source.name,
          sourceEmail: source.email,
          targetId: abnMatch.id ?? null,
          targetName: abnMatch.name,
          confidence: 0.95,
          matchMethod: "exact_abn",
          isDuplicate: true,
          requiresReview: false,
        })
        continue
      }
    }

    // Try exact name match
    const nameMatch = existingContacts.find(
      (c) => c.name.toLowerCase() === source.name.toLowerCase()
    )
    if (nameMatch) {
      results.push({
        sourceName: source.name,
        sourceEmail: source.email,
        targetId: nameMatch.id ?? null,
        targetName: nameMatch.name,
        confidence: 0.85,
        matchMethod: "exact_name",
        isDuplicate: true,
        requiresReview: true,
      })
      continue
    }

    // Try fuzzy name match
    const fuzzyScore = bestFuzzyContactMatch(source.name, existingContacts)
    if (fuzzyScore && fuzzyScore.score >= 0.75) {
      results.push({
        sourceName: source.name,
        sourceEmail: source.email,
        targetId: fuzzyScore.contact.id ?? null,
        targetName: fuzzyScore.contact.name,
        confidence: fuzzyScore.score,
        matchMethod: "fuzzy_name",
        isDuplicate: true,
        requiresReview: true,
      })
      continue
    }

    // New contact
    results.push({
      sourceName: source.name,
      sourceEmail: source.email,
      targetId: null,
      targetName: null,
      confidence: 0,
      matchMethod: "none",
      isDuplicate: false,
      requiresReview: false,
    })
  }

  return results
}

// ============================================
// Code Transformations
// ============================================

/**
 * Convert account codes between different accounting systems.
 * Uses code range heuristics and explicit rules.
 */
export function transformAccountCode(
  sourceCode: string,
  sourceSystem: string,
  rules: MigrationRuleInput[]
): string | null {
  // Check explicit rules first
  const rule = rules
    .filter(
      (r) =>
        r.entityType === "Account" &&
        r.sourceField === "code" &&
        r.sourceValue === sourceCode
    )
    .sort((a, b) => b.priority - a.priority)[0]

  if (rule) return rule.targetValue

  // Xero code ranges: 200-299 Revenue, 300-399 Direct Costs, 400-499 Expenses, 500-599 Assets, etc.
  // MYOB code ranges: 1-xxxx Assets, 2-xxxx Liabilities, 3-xxxx Equity, 4-xxxx Revenue, 5-xxxx COGS, 6-xxxx Expenses
  // QuickBooks varies but often similar to MYOB

  const codeNum = parseInt(sourceCode.replace(/\D/g, ""), 10)
  if (isNaN(codeNum)) return null

  if (sourceSystem === "Xero") {
    return mapXeroCodeRange(codeNum)
  } else if (sourceSystem === "MYOB") {
    return mapMYOBCodeRange(sourceCode)
  }

  return null
}

function mapXeroCodeRange(code: number): string | null {
  if (code >= 200 && code < 300) return `4${String(code).padStart(4, "0")}`
  if (code >= 300 && code < 400) return `5${String(code).padStart(4, "0")}`
  if (code >= 400 && code < 500) return `6${String(code).padStart(4, "0")}`
  if (code >= 500 && code < 600) return `1${String(code).padStart(4, "0")}`
  if (code >= 800 && code < 900) return `2${String(code).padStart(4, "0")}`
  if (code >= 900 && code < 1000) return `3${String(code).padStart(4, "0")}`
  return null
}

function mapMYOBCodeRange(code: string): string | null {
  // MYOB uses dash-separated ranges like 1-1100
  const parts = code.split("-")
  if (parts.length === 2) {
    return parts.join("")
  }
  return code
}

/**
 * Map tax codes from source system to our standardized tax rates.
 * Handles common Australian GST codes from Xero and MYOB.
 */
export function transformTaxCode(
  sourceTaxCode: string,
  sourceSystem: string
): string | null {
  const normalizedCode = sourceTaxCode.toUpperCase().trim()

  const xeroTaxMap: Record<string, string> = {
    "GST ON INCOME": "GST",
    "GST ON EXPENSES": "GST",
    "GST FREE INCOME": "GST Free",
    "GST FREE EXPENSES": "GST Free",
    "BAS EXCLUDED": "BAS Excluded",
    "GST ON IMPORTS": "GST",
    "INPUT TAXED": "Input Taxed",
    "NO TAX": "No Tax",
    "EXEMPTIONS": "GST Free",
  }

  const myobTaxMap: Record<string, string> = {
    "GST": "GST",
    "FRE": "GST Free",
    "INP": "Input Taxed",
    "N-T": "No Tax",
    "EXP": "GST Free",
    "CAP": "GST",
    "GNR": "GST",
    "ITS": "Input Taxed",
  }

  if (sourceSystem === "Xero") {
    return xeroTaxMap[normalizedCode] ?? null
  } else if (sourceSystem === "MYOB") {
    return myobTaxMap[normalizedCode] ?? null
  } else if (sourceSystem === "QuickBooks") {
    // QuickBooks uses similar GST codes in AU version
    if (normalizedCode.includes("GST")) return "GST"
    if (normalizedCode.includes("FREE")) return "GST Free"
    if (normalizedCode.includes("EXEMPT")) return "GST Free"
    return null
  }

  return null
}

// ============================================
// Transaction Recategorization
// ============================================

/**
 * Apply recategorization rules to a transaction.
 * Returns the target account ID if a rule matches, null otherwise.
 */
export function recategorizeTransaction(
  transaction: { description: string; amount: number; accountCode?: string },
  rules: MigrationRuleInput[],
  targetAccounts: TargetAccount[]
): { targetAccountId: string; ruleName: string } | null {
  const applicableRules = rules
    .filter(
      (r) =>
        r.ruleType === "CategoryChange" &&
        r.entityType === "Transaction"
    )
    .sort((a, b) => b.priority - a.priority)

  for (const rule of applicableRules) {
    let matches = false

    if (rule.sourceField === "description") {
      matches = transaction.description
        .toLowerCase()
        .includes(rule.sourceValue.toLowerCase())
    } else if (rule.sourceField === "accountCode") {
      matches = transaction.accountCode === rule.sourceValue
    } else if (rule.sourceField === "amount") {
      const ruleAmount = parseFloat(rule.sourceValue)
      matches = !isNaN(ruleAmount) && Math.abs(transaction.amount - ruleAmount) < 0.01
    }

    if (matches) {
      const target = targetAccounts.find(
        (a) => a.code === rule.targetValue || a.id === rule.targetValue
      )
      if (target) {
        return { targetAccountId: target.id, ruleName: rule.sourceField }
      }
    }
  }

  return null
}

// ============================================
// Duplicate Detection
// ============================================

/**
 * Find potential duplicates using fuzzy matching on names, amounts, dates.
 */
export function detectDuplicates(
  sourceRecords: Array<{
    id: string
    name: string
    amount?: number
    date?: string
  }>,
  existingRecords: Array<{
    id: string
    name: string
    amount?: number
    date?: string
  }>,
  entityType: string
): DuplicateResult[] {
  const results: DuplicateResult[] = []

  for (const source of sourceRecords) {
    for (const existing of existingRecords) {
      const matchFields: string[] = []
      let totalScore = 0
      let checks = 0

      // Name similarity
      const nameScore = calculateSimilarity(
        source.name.toLowerCase(),
        existing.name.toLowerCase()
      )
      if (nameScore >= 0.7) matchFields.push("name")
      totalScore += nameScore
      checks++

      // Amount match (if both have amounts)
      if (
        source.amount !== undefined &&
        existing.amount !== undefined
      ) {
        const amountMatch =
          Math.abs(source.amount - existing.amount) < 0.01 ? 1.0 : 0.0
        if (amountMatch > 0) matchFields.push("amount")
        totalScore += amountMatch
        checks++
      }

      // Date match (if both have dates)
      if (source.date && existing.date) {
        const dateMatch = source.date === existing.date ? 1.0 : 0.0
        if (dateMatch > 0) matchFields.push("date")
        totalScore += dateMatch
        checks++
      }

      const confidence = checks > 0 ? totalScore / checks : 0

      if (confidence >= 0.7 && matchFields.length >= 1) {
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          existingId: existing.id,
          existingName: existing.name,
          confidence,
          matchFields,
        })
      }
    }
  }

  return results
}

// ============================================
// Opening Balances & Journal Entries
// ============================================

/**
 * Calculate opening balance journal entries for migration cutover.
 */
export function generateOpeningBalances(
  accounts: Array<{ accountId: string; accountCode: string; balance: number }>,
  asOfDate: Date
): Array<{
  accountId: string
  accountCode: string
  debit: number
  credit: number
  description: string
  date: Date
}> {
  const entries: Array<{
    accountId: string
    accountCode: string
    debit: number
    credit: number
    description: string
    date: Date
  }> = []

  for (const account of accounts) {
    if (Math.abs(account.balance) < 0.01) continue

    entries.push({
      accountId: account.accountId,
      accountCode: account.accountCode,
      debit: account.balance > 0 ? account.balance : 0,
      credit: account.balance < 0 ? Math.abs(account.balance) : 0,
      description: `Opening balance migration - Account ${account.accountCode}`,
      date: asOfDate,
    })
  }

  return entries
}

/**
 * Create journal entries documenting the data transfer for audit trail.
 */
export async function generateMigrationJournalEntries(
  migrationJobId: string,
  mappings: Array<{
    entityType: string
    sourceId: string
    targetId: string | null
    sourceName: string
    amount?: number
  }>
): Promise<{ created: number; skipped: number }> {
  const job = await prisma.migrationJob.findUnique({
    where: { id: migrationJobId },
    include: { organization: true },
  })

  if (!job) {
    throw new Error(`Migration job ${migrationJobId} not found`)
  }

  let created = 0
  let skipped = 0

  // Group mappings that have amounts (transactions, invoices, etc.)
  const transactionalMappings = mappings.filter(
    (m) => m.amount && m.amount !== 0 && m.targetId
  )

  if (transactionalMappings.length === 0) {
    return { created: 0, skipped: mappings.length }
  }

  // Get next entry number
  const lastEntry = await prisma.journalEntry.findFirst({
    where: { organizationId: job.organizationId },
    orderBy: { entryNumber: "desc" },
  })
  const nextEntryNumber = (lastEntry?.entryNumber ?? 0) + 1

  // Create a summary journal entry for the migration
  const journalEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: nextEntryNumber,
      date: new Date(),
      reference: `MIG-${job.id.slice(0, 8)}`,
      narration: `Data migration from ${job.sourceSystem}: ${job.name}`,
      status: "Posted",
      sourceType: "Migration",
      sourceId: migrationJobId,
      organizationId: job.organizationId,
    },
  })

  // Link to migration
  await prisma.migrationJournalEntry.create({
    data: {
      migrationJobId,
      journalEntryId: journalEntry.id,
      description: `Migration journal entry for ${job.name}`,
      entryType: "DataTransfer",
      sourceReference: job.sourceSystem,
      amount: transactionalMappings.reduce(
        (sum, m) => sum + Math.abs(m.amount ?? 0),
        0
      ),
    },
  })

  created++
  skipped = mappings.length - transactionalMappings.length

  return { created, skipped }
}

// ============================================
// Fuzzy Matching Helpers
// ============================================

function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0
  if (a.length === 0 || b.length === 0) return 0.0

  // Levenshtein distance-based similarity
  const matrix: number[][] = []
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const distance = matrix[a.length][b.length]
  const maxLen = Math.max(a.length, b.length)
  return 1.0 - distance / maxLen
}

function findBestFuzzyMatch(
  name: string,
  accounts: TargetAccount[]
): { account: TargetAccount; score: number } | null {
  let bestMatch: TargetAccount | null = null
  let bestScore = 0

  const normalizedName = name.toLowerCase()

  for (const account of accounts) {
    const score = calculateSimilarity(
      normalizedName,
      account.name.toLowerCase()
    )
    if (score > bestScore) {
      bestScore = score
      bestMatch = account
    }
  }

  return bestMatch ? { account: bestMatch, score: bestScore } : null
}

function findTypeMatch(
  source: SourceAccount,
  targets: TargetAccount[]
): TargetAccount | null {
  const typeMap: Record<string, string[]> = {
    REVENUE: ["Revenue", "Income", "Sales"],
    SALES: ["Revenue", "Income", "Sales"],
    INCOME: ["Revenue", "Income", "Sales"],
    EXPENSE: ["Expense", "Expenses", "Operating Expenses"],
    EXPENSES: ["Expense", "Expenses", "Operating Expenses"],
    DIRECTCOSTS: ["Cost of Sales", "COGS", "Direct Costs"],
    CURRLIAB: ["Current Liability", "Liability"],
    CURRLIABILITY: ["Current Liability", "Liability"],
    LIABILITY: ["Current Liability", "Liability"],
    FIXED: ["Fixed Asset", "Asset"],
    BANK: ["Bank", "Current Asset"],
    EQUITY: ["Equity"],
    OTHERINCOME: ["Other Income", "Revenue"],
    OVERHEADS: ["Expense", "Overhead"],
  }

  const sourceType = source.type.toUpperCase().replace(/[\s_-]/g, "")
  const possibleTypes = typeMap[sourceType] ?? []

  for (const targetType of possibleTypes) {
    const match = targets.find(
      (t) => t.type.toLowerCase() === targetType.toLowerCase()
    )
    if (match) return match
  }

  return null
}

function bestFuzzyContactMatch(
  name: string,
  contacts: SourceContact[]
): { contact: SourceContact; score: number } | null {
  let bestMatch: SourceContact | null = null
  let bestScore = 0

  const normalizedName = name.toLowerCase()

  for (const contact of contacts) {
    const score = calculateSimilarity(
      normalizedName,
      contact.name.toLowerCase()
    )
    if (score > bestScore) {
      bestScore = score
      bestMatch = contact
    }
  }

  return bestMatch ? { contact: bestMatch, score: bestScore } : null
}
