"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"

interface RuleSuggestion {
  transactionId: string
  ruleId: string
  ruleName: string
  accountId: string
  contactId: string | null
  taxType: string | null
  rdProjectId: string | null
}

interface BankRule {
  id: string
  name: string
  matchField: string
  matchType: string
  matchValue: string
  accountId: string
  contactId: string | null
  taxType: string | null
  rdProjectId: string | null
  isActive: boolean
  priority: number
  account: { id: string; code: string; name: string }
}

interface BankTransaction {
  id: string
  date: string
  description: string
  amount: number
  reference: string | null
  reconciled: boolean
  matchedJournalId: string | null
  matchedJournal: JournalEntry | null
}

interface JournalEntry {
  id: string
  entryNumber: number
  date: string
  reference: string | null
  narration: string
  status: string
  lines: JournalLine[]
}

interface JournalLine {
  id: string
  debit: number
  credit: number
  description: string | null
  account: { id: string; code: string; name: string }
}

interface Account {
  id: string
  code: string
  name: string
  type: string
}

interface MatchSuggestion {
  journalId: string
  score: number
  reasons: string[]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount)
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function daysBetween(a: string | Date, b: string | Date): number {
  const d1 = new Date(a).getTime()
  const d2 = new Date(b).getTime()
  return Math.abs(d1 - d2) / (1000 * 60 * 60 * 24)
}

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const la = a.toLowerCase().trim()
  const lb = b.toLowerCase().trim()
  if (la === lb) return 1
  if (la.includes(lb) || lb.includes(la)) return 0.7
  const wordsA = la.split(/\s+/)
  const wordsB = lb.split(/\s+/)
  const common = wordsA.filter((w) => wordsB.includes(w)).length
  const total = Math.max(wordsA.length, wordsB.length)
  return total > 0 ? common / total : 0
}

function getJournalNetAmount(je: JournalEntry): number {
  const totalDebits = je.lines.reduce((s, l) => s + l.debit, 0)
  const totalCredits = je.lines.reduce((s, l) => s + l.credit, 0)
  return totalDebits - totalCredits
}

export default function ReconciliationView() {
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([])
  const [unmatchedJournals, setUnmatchedJournals] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  const [selectedJeId, setSelectedJeId] = useState<string | null>(null)
  const [matching, setMatching] = useState(false)
  const [error, setError] = useState("")
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [quickFormTxId, setQuickFormTxId] = useState<string | null>(null)
  const [bankRules, setBankRules] = useState<BankRule[]>([])
  const [ruleSuggestions, setRuleSuggestions] = useState<Record<string, RuleSuggestion>>({})

  // Quick JE form state
  const [qfNarration, setQfNarration] = useState("")
  const [qfDebitAccountId, setQfDebitAccountId] = useState("")
  const [qfCreditAccountId, setQfCreditAccountId] = useState("")
  const [qfSubmitting, setQfSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [txRes, jeRes, accRes, rulesRes] = await Promise.all([
        fetch("/api/banking"),
        fetch("/api/journal-entries?status=Posted"),
        fetch("/api/accounts"),
        fetch("/api/banking/rules"),
      ])
      const txData = await txRes.json()
      const jeData = await jeRes.json()
      const accData = await accRes.json()
      const rulesData = await rulesRes.json()

      if (Array.isArray(txData)) setBankTransactions(txData)
      if (Array.isArray(accData)) setAccounts(accData)
      if (Array.isArray(rulesData)) {
        setBankRules(rulesData)
        // Compute rule-based categorization suggestions for unreconciled transactions
        const unreconciled = (Array.isArray(txData) ? txData : []).filter(
          (t: BankTransaction) => !t.reconciled
        )
        const activeRules = rulesData.filter((r: BankRule) => r.isActive).sort(
          (a: BankRule, b: BankRule) => b.priority - a.priority
        )
        const suggestionsMap: Record<string, RuleSuggestion> = {}
        for (const tx of unreconciled) {
          for (const rule of activeRules) {
            const fieldValue =
              rule.matchField === "description"
                ? tx.description || ""
                : rule.matchField === "amount"
                ? String(tx.amount)
                : tx.reference || ""
            const lv = fieldValue.toLowerCase()
            const mv = rule.matchValue.toLowerCase()
            let matched = false
            if (rule.matchType === "contains") matched = lv.includes(mv)
            else if (rule.matchType === "exact") matched = lv === mv
            else if (rule.matchType === "startsWith") matched = lv.startsWith(mv)
            else if (rule.matchType === "regex") {
              try { matched = new RegExp(rule.matchValue, "i").test(fieldValue) } catch { matched = false }
            }
            if (matched) {
              suggestionsMap[tx.id] = {
                transactionId: tx.id,
                ruleId: rule.id,
                ruleName: rule.name,
                accountId: rule.accountId,
                contactId: rule.contactId,
                taxType: rule.taxType,
                rdProjectId: rule.rdProjectId,
              }
              break
            }
          }
        }
        setRuleSuggestions(suggestionsMap)
      }

      // Filter unmatched journals: those not already matched to a bank tx
      if (Array.isArray(jeData)) {
        const matchedJournalIds = new Set(
          (Array.isArray(txData) ? txData : [])
            .filter((t: BankTransaction) => t.matchedJournalId)
            .map((t: BankTransaction) => t.matchedJournalId)
        )
        setUnmatchedJournals(
          jeData.filter((je: JournalEntry) => !matchedJournalIds.has(je.id))
        )
      }
    } catch {
      setError("Failed to load reconciliation data.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const unreconciledTx = useMemo(
    () => bankTransactions.filter((t) => !t.reconciled),
    [bankTransactions]
  )

  const reconciledTx = useMemo(
    () => bankTransactions.filter((t) => t.reconciled),
    [bankTransactions]
  )

  const totalCount = bankTransactions.length
  const reconciledCount = reconciledTx.length
  const unreconciledCount = unreconciledTx.length
  const reconciledPercent = totalCount > 0 ? (reconciledCount / totalCount) * 100 : 0

  const bankBalance = useMemo(
    () => bankTransactions.reduce((s, t) => s + t.amount, 0),
    [bankTransactions]
  )

  const reconciledBalance = useMemo(
    () => reconciledTx.reduce((s, t) => s + t.amount, 0),
    [reconciledTx]
  )

  const unreconciledBalance = useMemo(
    () => unreconciledTx.reduce((s, t) => s + t.amount, 0),
    [unreconciledTx]
  )

  const bookBalance = useMemo(() => {
    // Book balance = sum of all matched journal net amounts
    return reconciledTx.reduce((s, t) => {
      if (t.matchedJournal) {
        return s + getJournalNetAmount(t.matchedJournal)
      }
      return s
    }, 0)
  }, [reconciledTx])

  // Auto-suggest matches for the selected bank transaction
  const suggestions = useMemo((): Record<string, MatchSuggestion> => {
    if (!selectedTxId) return {}
    const tx = unreconciledTx.find((t) => t.id === selectedTxId)
    if (!tx) return {}

    const result: Record<string, MatchSuggestion> = {}

    for (const je of unmatchedJournals) {
      const netAmount = getJournalNetAmount(je)
      const reasons: string[] = []
      let score = 0

      // Exact amount match (bank deposit = positive, withdrawal = negative)
      if (Math.abs(Math.abs(tx.amount) - Math.abs(netAmount)) < 0.01) {
        score += 50
        reasons.push("Amount match")
      }

      // Date proximity (within 3 days)
      const days = daysBetween(tx.date, je.date)
      if (days <= 3) {
        score += 30 - days * 5
        reasons.push(days === 0 ? "Same date" : `${Math.round(days)}d apart`)
      }

      // Reference similarity
      if (tx.reference && je.reference) {
        const sim = stringSimilarity(tx.reference, je.reference)
        if (sim > 0.3) {
          score += sim * 20
          reasons.push("Ref. similar")
        }
      }

      if (score > 10) {
        result[je.id] = { journalId: je.id, score, reasons }
      }
    }

    return result
  }, [selectedTxId, unreconciledTx, unmatchedJournals])

  // Sort unmatched journals: suggestions first
  const sortedJournals = useMemo(() => {
    if (!selectedTxId) return unmatchedJournals
    return [...unmatchedJournals].sort((a, b) => {
      const sa = suggestions[a.id]?.score || 0
      const sb = suggestions[b.id]?.score || 0
      return sb - sa
    })
  }, [unmatchedJournals, suggestions, selectedTxId])

  const handleMatch = async () => {
    if (!selectedTxId || !selectedJeId) return
    setMatching(true)
    setError("")
    try {
      const res = await fetch("/api/banking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reconcile: { transactionId: selectedTxId, journalId: selectedJeId },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to reconcile.")
        return
      }
      setSelectedTxId(null)
      setSelectedJeId(null)
      await fetchData()
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setMatching(false)
    }
  }

  const openQuickForm = (txId: string) => {
    const tx = unreconciledTx.find((t) => t.id === txId)
    if (!tx) return
    setQuickFormTxId(txId)
    setQfNarration(tx.description)
    setQfDebitAccountId("")
    setQfCreditAccountId("")
    setShowQuickForm(true)
  }

  const handleQuickCreate = async () => {
    if (!quickFormTxId) return
    const tx = unreconciledTx.find((t) => t.id === quickFormTxId)
    if (!tx) return

    if (!qfNarration.trim() || !qfDebitAccountId || !qfCreditAccountId) {
      setError("Please fill in narration and both accounts.")
      return
    }

    setQfSubmitting(true)
    setError("")
    try {
      const absAmount = Math.abs(tx.amount)
      const lines =
        tx.amount >= 0
          ? [
              { accountId: qfDebitAccountId, debit: absAmount, credit: 0 },
              { accountId: qfCreditAccountId, debit: 0, credit: absAmount },
            ]
          : [
              { accountId: qfDebitAccountId, debit: 0, credit: absAmount },
              { accountId: qfCreditAccountId, debit: absAmount, credit: 0 },
            ]

      const jeRes = await fetch("/api/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: tx.date,
          narration: qfNarration,
          reference: tx.reference || undefined,
          status: "Posted",
          lines,
        }),
      })

      if (!jeRes.ok) {
        const data = await jeRes.json()
        setError(data.error || "Failed to create journal entry.")
        return
      }

      const newJe = await jeRes.json()

      // Immediately reconcile
      const reconRes = await fetch("/api/banking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reconcile: { transactionId: quickFormTxId, journalId: newJe.id },
        }),
      })

      if (!reconRes.ok) {
        const data = await reconRes.json()
        setError(data.error || "Journal created but reconciliation failed.")
      }

      setShowQuickForm(false)
      setQuickFormTxId(null)
      await fetchData()
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setQfSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading reconciliation data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bank Reconciliation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Match bank transactions with journal entries
          </p>
        </div>
        <Link
          href="/banking/rules"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Manage Rules
        </Link>
      </div>

      {/* Auto-categorization suggestions */}
      {Object.keys(ruleSuggestions).length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-indigo-800">
                Auto-Categorization Suggestions
              </h3>
              <p className="text-sm text-indigo-600">
                {Object.keys(ruleSuggestions).length} unreconciled transaction(s) match bank rules.
                Look for the rule badge on transactions below.
              </p>
            </div>
            <Link
              href="/banking/rules"
              className="text-sm font-medium text-indigo-700 hover:text-indigo-900"
            >
              Edit Rules
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Unreconciled</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{unreconciledCount}</p>
          <p className="mt-0.5 text-xs text-slate-400">{formatCurrency(unreconciledBalance)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-600">Total Reconciled</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{reconciledCount}</p>
          <p className="mt-0.5 text-xs text-emerald-500">{formatCurrency(reconciledBalance)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Bank Balance</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(bankBalance)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Book Balance</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(bookBalance)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Difference</p>
          <p
            className={`mt-1 text-xl font-bold ${
              Math.abs(bankBalance - bookBalance) < 0.01 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {formatCurrency(bankBalance - bookBalance)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Reconciliation Progress</h3>
          <span className="text-sm text-slate-500">{reconciledPercent.toFixed(1)}% complete</span>
        </div>
        <div className="h-3 rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-indigo-600 transition-all"
            style={{ width: `${reconciledPercent}%` }}
          />
        </div>
      </div>

      {/* Match action bar */}
      {selectedTxId && selectedJeId && (
        <div className="sticky top-0 z-10 rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm flex items-center justify-between">
          <p className="text-sm font-medium text-indigo-800">
            Ready to match selected bank transaction with journal entry
          </p>
          <button
            onClick={handleMatch}
            disabled={matching}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {matching ? "Matching..." : "Match Selected"}
          </button>
        </div>
      )}

      {/* Split Pane */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Unreconciled Bank Transactions */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Unreconciled Bank Transactions
            </h2>
            <p className="text-sm text-slate-500">{unreconciledTx.length} items</p>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
            {unreconciledTx.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                All transactions reconciled
              </div>
            ) : (
              unreconciledTx.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => {
                    setSelectedTxId(selectedTxId === tx.id ? null : tx.id)
                    setSelectedJeId(null)
                  }}
                  className={`cursor-pointer px-6 py-4 transition-colors ${
                    selectedTxId === tx.id
                      ? "bg-indigo-50 border-l-4 border-l-indigo-500"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {tx.description}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span>{formatDate(tx.date)}</span>
                        {tx.reference && (
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {tx.reference}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`ml-3 whitespace-nowrap font-mono text-sm font-semibold tabular-nums ${
                        tx.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                  {ruleSuggestions[tx.id] && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        Rule: {ruleSuggestions[tx.id].ruleName}
                        {bankRules.find((r) => r.id === ruleSuggestions[tx.id].ruleId)?.account && (
                          <span className="ml-1 text-indigo-500">
                            → {bankRules.find((r) => r.id === ruleSuggestions[tx.id].ruleId)?.account.code}{" "}
                            {bankRules.find((r) => r.id === ruleSuggestions[tx.id].ruleId)?.account.name}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {selectedTxId === tx.id && (
                    <div className="mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openQuickForm(tx.id)
                        }}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        + Create Journal Entry
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Unmatched Journal Entries */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Unmatched Journal Entries
            </h2>
            <p className="text-sm text-slate-500">{unmatchedJournals.length} items</p>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
            {sortedJournals.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                No unmatched journal entries
              </div>
            ) : (
              sortedJournals.map((je) => {
                const netAmount = getJournalNetAmount(je)
                const suggestion = suggestions[je.id]
                const isSuggested = !!suggestion && suggestion.score > 10
                const isSelected = selectedJeId === je.id

                return (
                  <div
                    key={je.id}
                    onClick={() =>
                      setSelectedJeId(isSelected ? null : je.id)
                    }
                    className={`cursor-pointer px-6 py-4 transition-colors ${
                      isSelected
                        ? "bg-indigo-50 border-l-4 border-l-indigo-500"
                        : isSuggested
                        ? "bg-amber-50/50 hover:bg-amber-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {je.narration}
                          </p>
                          {isSuggested && (
                            <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Suggested
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                          <span>{formatDate(je.date)}</span>
                          <span className="font-mono text-slate-400">
                            #{je.entryNumber}
                          </span>
                          {je.reference && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              {je.reference}
                            </span>
                          )}
                        </div>
                        {isSuggested && suggestion && (
                          <div className="mt-1 flex gap-1.5">
                            {suggestion.reasons.map((r, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded bg-amber-100/80 px-1.5 py-0.5 text-xs text-amber-600"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span
                        className={`ml-3 whitespace-nowrap font-mono text-sm font-semibold tabular-nums ${
                          netAmount >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {formatCurrency(netAmount)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Create Journal Entry Modal */}
      {showQuickForm && quickFormTxId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Create Journal Entry for Transaction
            </h3>
            {(() => {
              const tx = unreconciledTx.find((t) => t.id === quickFormTxId)
              if (!tx) return null
              return (
                <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-900">{tx.description}</p>
                  <p className="text-slate-500">
                    {formatDate(tx.date)} &middot;{" "}
                    <span
                      className={`font-mono font-semibold ${
                        tx.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {formatCurrency(tx.amount)}
                    </span>
                  </p>
                </div>
              )
            })()}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Narration
                </label>
                <input
                  type="text"
                  value={qfNarration}
                  onChange={(e) => setQfNarration(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Debit Account
                </label>
                <select
                  value={qfDebitAccountId}
                  onChange={(e) => setQfDebitAccountId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Credit Account
                </label>
                <select
                  value={qfCreditAccountId}
                  onChange={(e) => setQfCreditAccountId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowQuickForm(false)
                  setQuickFormTxId(null)
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickCreate}
                disabled={qfSubmitting}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {qfSubmitting ? "Creating..." : "Create & Reconcile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
