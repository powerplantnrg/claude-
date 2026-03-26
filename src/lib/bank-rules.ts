/**
 * Bank transaction auto-categorization rules engine.
 */

interface BankTransaction {
  id: string
  date: string | Date
  description: string
  amount: number
  reference: string | null
  reconciled: boolean
}

interface BankRule {
  id: string
  name: string
  matchField: string // description, amount, reference
  matchType: string  // contains, exact, startsWith, regex
  matchValue: string
  accountId: string
  contactId: string | null
  taxType: string | null
  rdProjectId: string | null
  isActive: boolean
  priority: number
}

export interface CategorizationSuggestion {
  transactionId: string
  ruleId: string
  ruleName: string
  accountId: string
  contactId: string | null
  taxType: string | null
  rdProjectId: string | null
}

function getFieldValue(transaction: BankTransaction, field: string): string {
  switch (field) {
    case "description":
      return transaction.description || ""
    case "amount":
      return String(transaction.amount)
    case "reference":
      return transaction.reference || ""
    default:
      return ""
  }
}

function matchesRule(fieldValue: string, matchType: string, matchValue: string): boolean {
  const lowerValue = fieldValue.toLowerCase()
  const lowerMatch = matchValue.toLowerCase()

  switch (matchType) {
    case "contains":
      return lowerValue.includes(lowerMatch)
    case "exact":
      return lowerValue === lowerMatch
    case "startsWith":
      return lowerValue.startsWith(lowerMatch)
    case "regex":
      try {
        const regex = new RegExp(matchValue, "i")
        return regex.test(fieldValue)
      } catch {
        return false
      }
    default:
      return false
  }
}

/**
 * Apply rules to a single transaction. Returns the highest-priority matching rule, or null.
 */
export function applyRules(
  transaction: BankTransaction,
  rules: BankRule[]
): BankRule | null {
  const activeRules = rules
    .filter((r) => r.isActive)
    .sort((a, b) => b.priority - a.priority)

  for (const rule of activeRules) {
    const fieldValue = getFieldValue(transaction, rule.matchField)
    if (matchesRule(fieldValue, rule.matchType, rule.matchValue)) {
      return rule
    }
  }

  return null
}

/**
 * Auto-categorize a batch of transactions. Returns suggestions for each transaction
 * that matches at least one rule.
 */
export function autoCategorizeBatch(
  transactions: BankTransaction[],
  rules: BankRule[]
): CategorizationSuggestion[] {
  const suggestions: CategorizationSuggestion[] = []

  for (const tx of transactions) {
    const matchedRule = applyRules(tx, rules)
    if (matchedRule) {
      suggestions.push({
        transactionId: tx.id,
        ruleId: matchedRule.id,
        ruleName: matchedRule.name,
        accountId: matchedRule.accountId,
        contactId: matchedRule.contactId,
        taxType: matchedRule.taxType,
        rdProjectId: matchedRule.rdProjectId,
      })
    }
  }

  return suggestions
}

/**
 * Test which transactions would match a given rule configuration.
 * Used by the rule form "Test" button.
 */
export function testRule(
  transactions: BankTransaction[],
  matchField: string,
  matchType: string,
  matchValue: string
): BankTransaction[] {
  return transactions.filter((tx) => {
    const fieldValue = getFieldValue(tx, matchField)
    return matchesRule(fieldValue, matchType, matchValue)
  })
}
