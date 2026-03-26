"use client"

import { downloadCSV } from "@/lib/csv-export"

interface AccountItem {
  code: string
  name: string
  type: string
  balance: number
}

interface BalanceSheetExportProps {
  assets: AccountItem[]
  liabilities: AccountItem[]
  equity: AccountItem[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  retainedEarnings: number
  totalEquityWithRetained: number
  totalLiabilitiesAndEquity: number
  asOfDate: string
}

export function BalanceSheetExportButton({
  assets,
  liabilities,
  equity,
  totalAssets,
  totalLiabilities,
  totalEquity,
  retainedEarnings,
  totalEquityWithRetained,
  totalLiabilitiesAndEquity,
  asOfDate,
}: BalanceSheetExportProps) {
  const handleExport = () => {
    const headers = ["Section", "Account Code", "Account Name", "Balance"]
    const rows: string[][] = []

    for (const item of assets) {
      rows.push(["Assets", item.code, item.name, item.balance.toFixed(2)])
    }
    rows.push(["", "", "Total Assets", totalAssets.toFixed(2)])
    rows.push(["", "", "", ""])

    for (const item of liabilities) {
      rows.push(["Liabilities", item.code, item.name, item.balance.toFixed(2)])
    }
    rows.push(["", "", "Total Liabilities", totalLiabilities.toFixed(2)])
    rows.push(["", "", "", ""])

    for (const item of equity) {
      rows.push(["Equity", item.code, item.name, item.balance.toFixed(2)])
    }
    rows.push(["Equity", "", "Retained Earnings (Current Period)", retainedEarnings.toFixed(2)])
    rows.push(["", "", "Total Equity (incl. Retained Earnings)", totalEquityWithRetained.toFixed(2)])
    rows.push(["", "", "", ""])

    rows.push(["", "", "Total Liabilities & Equity", totalLiabilitiesAndEquity.toFixed(2)])

    const filename = `balance-sheet-${asOfDate}.csv`
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
