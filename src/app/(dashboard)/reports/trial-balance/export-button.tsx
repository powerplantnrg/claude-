"use client"

import { downloadCSV } from "@/lib/csv-export"

interface TrialBalanceRow {
  code: string
  name: string
  type: string
  totalDebit: number
  totalCredit: number
}

interface TrialBalanceExportProps {
  rows: TrialBalanceRow[]
  grandTotalDebit: number
  grandTotalCredit: number
  asOfDate: string
}

export function TrialBalanceExportButton({
  rows,
  grandTotalDebit,
  grandTotalCredit,
  asOfDate,
}: TrialBalanceExportProps) {
  const handleExport = () => {
    const headers = ["Code", "Account Name", "Type", "Debit", "Credit"]
    const csvRows: string[][] = []

    for (const row of rows) {
      csvRows.push([
        row.code,
        row.name,
        row.type,
        row.totalDebit > 0 ? row.totalDebit.toFixed(2) : "",
        row.totalCredit > 0 ? row.totalCredit.toFixed(2) : "",
      ])
    }

    csvRows.push(["", "", "Grand Total", grandTotalDebit.toFixed(2), grandTotalCredit.toFixed(2)])

    const filename = `trial-balance-${asOfDate}.csv`
    downloadCSV(filename, headers, csvRows)
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
