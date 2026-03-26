"use client"

import { downloadCSV } from "@/lib/csv-export"

interface RevenueItem {
  code: string
  name: string
  total: number
}

interface ExpenseItem {
  code: string
  name: string
  total: number
  subType: string
}

interface ProfitLossExportProps {
  revenueItems: RevenueItem[]
  expenseItems: ExpenseItem[]
  totalRevenue: number
  totalExpenses: number
  netProfitLoss: number
  periodLabel: string
}

export function ProfitLossExportButton({
  revenueItems,
  expenseItems,
  totalRevenue,
  totalExpenses,
  netProfitLoss,
  periodLabel,
}: ProfitLossExportProps) {
  const handleExport = () => {
    const headers = ["Section", "Account Code", "Account Name", "Amount"]
    const rows: string[][] = []

    for (const item of revenueItems) {
      rows.push(["Revenue", item.code, item.name, item.total.toFixed(2)])
    }
    rows.push(["Revenue Total", "", "Total Revenue", totalRevenue.toFixed(2)])
    rows.push(["", "", "", ""])

    for (const item of expenseItems) {
      rows.push([`Expense - ${item.subType}`, item.code, item.name, item.total.toFixed(2)])
    }
    rows.push(["Expense Total", "", "Total Expenses", totalExpenses.toFixed(2)])
    rows.push(["", "", "", ""])

    rows.push(["", "", netProfitLoss >= 0 ? "Net Profit" : "Net Loss", Math.abs(netProfitLoss).toFixed(2)])

    const filename = `profit-loss-${periodLabel.replace(/\s+/g, "-").replace(/\//g, "-")}.csv`
    downloadCSV(filename, headers, rows)
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
    >
      Export CSV
    </button>
  )
}
