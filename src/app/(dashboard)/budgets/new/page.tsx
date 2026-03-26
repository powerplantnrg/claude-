"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Account {
  id: string
  code: string
  name: string
  type: string
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const

const MONTH_LABELS = [
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
]

// Map Australian FY month order to calendar months
const FY_MONTH_ORDER = [
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
] as const

interface BudgetRow {
  accountId: string
  accountName: string
  accountCode: string
  values: Record<string, number>
  total: number
}

function generateFYOptions() {
  const currentYear = new Date().getFullYear()
  const options: string[] = []
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    options.push(`${y}-${String(y + 1).slice(2)}`)
  }
  return options
}

export default function NewBudgetPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [financialYear, setFinancialYear] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [rows, setRows] = useState<BudgetRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fyOptions = generateFYOptions()

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data: Account[]) => {
        // Filter for expense accounts (typically budgeted)
        const expenseAccounts = data.filter(
          (a) => a.type === "Expense" || a.type === "Cost of Sales"
        )
        setAccounts(expenseAccounts)
        setRows(
          expenseAccounts.map((a) => ({
            accountId: a.id,
            accountName: a.name,
            accountCode: a.code,
            values: Object.fromEntries(MONTHS.map((m) => [m, 0])),
            total: 0,
          }))
        )
      })
      .catch(() => setError("Failed to load accounts"))
  }, [])

  const updateCell = useCallback(
    (rowIndex: number, month: string, value: number) => {
      setRows((prev) => {
        const updated = [...prev]
        const row = { ...updated[rowIndex] }
        row.values = { ...row.values, [month]: value }
        row.total = MONTHS.reduce((sum, m) => sum + (row.values[m] ?? 0), 0)
        updated[rowIndex] = row
        return updated
      })
    },
    []
  )

  const columnTotals = FY_MONTH_ORDER.map((m) =>
    rows.reduce((sum, row) => sum + (row.values[m] ?? 0), 0)
  )
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !financialYear) {
      setError("Name and financial year are required")
      return
    }

    setSaving(true)
    setError("")

    try {
      const items = rows
        .filter((row) => row.total > 0)
        .map((row) => ({
          accountId: row.accountId,
          ...row.values,
        }))

      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, financialYear, items }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create budget")
      }

      router.push("/budgets")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
    }).format(n)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Create New Budget
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Set monthly budget targets for each expense account
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Budget Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., FY 2025-26 Operating Budget"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Financial Year
            </label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              <option value="">Select financial year</option>
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[200px]">
                    Account
                  </th>
                  {MONTH_LABELS.map((label) => (
                    <th
                      key={label}
                      className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[90px]"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[100px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, rowIndex) => (
                  <tr key={row.accountId} className="hover:bg-slate-50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium text-slate-900 whitespace-nowrap">
                      <span className="text-slate-400 mr-2">
                        {row.accountCode}
                      </span>
                      {row.accountName}
                    </td>
                    {FY_MONTH_ORDER.map((month) => (
                      <td key={month} className="px-1 py-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.values[month] || ""}
                          onChange={(e) =>
                            updateCell(
                              rowIndex,
                              month,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-right text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right text-sm font-semibold text-slate-900">
                      {fmt(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                    Column Totals
                  </td>
                  {columnTotals.map((total, i) => (
                    <td
                      key={i}
                      className="px-2 py-3 text-center text-sm text-slate-900"
                    >
                      {fmt(total)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-sm text-indigo-700">
                    {fmt(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Create Budget"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/budgets")}
            className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
