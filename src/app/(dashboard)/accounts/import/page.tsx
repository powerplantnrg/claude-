"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { parseCSV } from "@/lib/csv-import"

const VALID_TYPES = ["Asset", "Liability", "Equity", "Revenue", "Expense"]
const VALID_TAX_TYPES = ["GST", "GST Free", "BAS Excluded"]

interface PreviewRow {
  code: string
  name: string
  type: string
  subType: string
  taxType: string
  valid: boolean
  error?: string
}

export default function ImportAccountsPage() {
  const router = useRouter()
  const [csvText, setCsvText] = useState("")
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [parsed, setParsed] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    imported: number
    errors: { row: number; message: string }[]
    total: number
  } | null>(null)
  const [error, setError] = useState("")

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        setCsvText(text)
        parseAndPreview(text)
      }
      reader.readAsText(file)
    },
    []
  )

  function parseAndPreview(text: string) {
    setError("")
    setResult(null)

    const { headers, rows } = parseCSV(text)

    if (headers.length === 0) {
      setError("CSV appears empty. Expected columns: Code, Name, Type, SubType, TaxType")
      setParsed(false)
      return
    }

    // Map columns (case-insensitive)
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim())
    const codeIdx = lowerHeaders.findIndex((h) => h === "code" || h === "account code")
    const nameIdx = lowerHeaders.findIndex((h) => h === "name" || h === "account name")
    const typeIdx = lowerHeaders.findIndex((h) => h === "type" || h === "account type")
    const subTypeIdx = lowerHeaders.findIndex((h) => h === "subtype" || h === "sub type")
    const taxTypeIdx = lowerHeaders.findIndex((h) => h === "taxtype" || h === "tax type")

    if (codeIdx === -1 || nameIdx === -1 || typeIdx === -1) {
      setError(
        `Missing required columns. Found: [${headers.join(", ")}]. Need: Code, Name, Type`
      )
      setParsed(false)
      return
    }

    const seenCodes = new Set<string>()
    const previewRows: PreviewRow[] = rows.map((row) => {
      const code = row[codeIdx]?.trim() || ""
      const name = row[nameIdx]?.trim() || ""
      const type = row[typeIdx]?.trim() || ""
      const subType = subTypeIdx >= 0 ? (row[subTypeIdx]?.trim() || "") : ""
      const taxType = taxTypeIdx >= 0 ? (row[taxTypeIdx]?.trim() || "") : ""

      let valid = true
      let rowError: string | undefined

      if (!code || !name || !type) {
        valid = false
        rowError = "Code, Name, and Type are required"
      } else if (!VALID_TYPES.includes(type)) {
        valid = false
        rowError = `Invalid type '${type}'`
      } else if (taxType && !VALID_TAX_TYPES.includes(taxType)) {
        valid = false
        rowError = `Invalid tax type '${taxType}'`
      } else if (seenCodes.has(code)) {
        valid = false
        rowError = `Duplicate code '${code}'`
      }

      seenCodes.add(code)

      return { code, name, type, subType, taxType, valid, error: rowError }
    })

    setPreview(previewRows)
    setParsed(true)
  }

  async function handleImport() {
    setImporting(true)
    setError("")
    setResult(null)

    const validRows = preview.filter((r) => r.valid)
    if (validRows.length === 0) {
      setError("No valid rows to import.")
      setImporting(false)
      return
    }

    try {
      const res = await fetch("/api/accounts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accounts: validRows.map((r) => ({
            code: r.code,
            name: r.name,
            type: r.type,
            subType: r.subType || undefined,
            taxType: r.taxType || undefined,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Import failed")
        if (data.errors) {
          setResult(data)
        }
      } else {
        setResult(data)
        if (data.imported > 0 && data.errors.length === 0) {
          // Redirect after successful full import
          setTimeout(() => router.push("/accounts"), 1500)
        }
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setImporting(false)
    }
  }

  const validCount = preview.filter((r) => r.valid).length
  const invalidCount = preview.filter((r) => !r.valid).length

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Accounts
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Import Chart of Accounts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a CSV file with columns: Code, Name, Type, SubType (optional), TaxType (optional)
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            result.errors.length === 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <p className="font-medium">
            Imported {result.imported} of {result.total} account(s).
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1">
              {result.errors.map((err, i) => (
                <li key={i}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Upload Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="csvFile" className="block text-sm font-medium text-slate-700">
              Upload CSV File
            </label>
            <input
              id="csvFile"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">or paste CSV content</span>
            </div>
          </div>

          <div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              placeholder={`Code,Name,Type,SubType,TaxType\n1000,Cash at Bank,Asset,Current Asset,GST Free\n2000,Accounts Payable,Liability,Current Liability,GST`}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {csvText && !parsed && (
            <button
              type="button"
              onClick={() => parseAndPreview(csvText)}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              Parse &amp; Preview
            </button>
          )}
        </div>
      </div>

      {/* Preview Table */}
      {parsed && preview.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Valid: {validCount}
              </span>
              {invalidCount > 0 && (
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                  Invalid: {invalidCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? "Importing..." : `Import ${validCount} Account(s)`}
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 w-8">#</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Sub Type</th>
                    <th className="px-4 py-3">Tax Type</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {preview.map((row, i) => (
                    <tr
                      key={i}
                      className={`text-sm ${
                        row.valid
                          ? "hover:bg-slate-50"
                          : "bg-red-50/50"
                      }`}
                    >
                      <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2 font-mono text-slate-700">{row.code || "\u2014"}</td>
                      <td className="px-4 py-2 text-slate-700">{row.name || "\u2014"}</td>
                      <td className="px-4 py-2 text-slate-700">{row.type || "\u2014"}</td>
                      <td className="px-4 py-2 text-slate-500">{row.subType || "\u2014"}</td>
                      <td className="px-4 py-2 text-slate-500">{row.taxType || "\u2014"}</td>
                      <td className="px-4 py-2">
                        {row.valid ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            OK
                          </span>
                        ) : (
                          <span className="text-xs text-red-600">{row.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
