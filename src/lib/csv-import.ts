/**
 * CSV Import Utility
 * Handles parsing CSV text with proper handling of quoted fields,
 * commas within values, and newlines within quoted fields.
 */

export interface ParsedCSV {
  headers: string[]
  rows: string[][]
}

/**
 * Parse CSV text into headers and rows.
 * Handles quoted fields, commas in values, and newlines within quotes.
 */
export function parseCSV(csvText: string): ParsedCSV {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let inQuotes = false
  let i = 0

  const text = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (double quote)
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        }
        // End of quoted field
        inQuotes = false
        i++
        continue
      }
      currentField += char
      i++
      continue
    }

    // Not in quotes
    if (char === '"') {
      inQuotes = true
      i++
      continue
    }

    if (char === ",") {
      currentRow.push(currentField.trim())
      currentField = ""
      i++
      continue
    }

    if (char === "\n") {
      currentRow.push(currentField.trim())
      currentField = ""
      if (currentRow.length > 0 && currentRow.some((f) => f !== "")) {
        rows.push(currentRow)
      }
      currentRow = []
      i++
      continue
    }

    currentField += char
    i++
  }

  // Handle last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some((f) => f !== "")) {
      rows.push(currentRow)
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = rows[0]
  const dataRows = rows.slice(1)

  return { headers, rows: dataRows }
}

/**
 * Create a row mapper function that maps CSV columns to field names.
 * @param headers - The CSV header row
 * @param mapping - Maps CSV column names to target field names (e.g., { "Date": "date", "Amount ($)": "amount" })
 * @returns A function that takes a CSV row and returns a mapped record
 */
export function mapColumns(
  headers: string[],
  mapping: Record<string, string>
): (row: string[]) => Record<string, string> {
  // Build index map: target field name -> column index
  const indexMap: Record<string, number> = {}

  for (const [csvHeader, fieldName] of Object.entries(mapping)) {
    const idx = headers.findIndex(
      (h) => h.toLowerCase().trim() === csvHeader.toLowerCase().trim()
    )
    if (idx !== -1) {
      indexMap[fieldName] = idx
    }
  }

  return (row: string[]): Record<string, string> => {
    const result: Record<string, string> = {}
    for (const [fieldName, colIndex] of Object.entries(indexMap)) {
      result[fieldName] = colIndex < row.length ? row[colIndex] : ""
    }
    return result
  }
}

/**
 * Auto-detect common column mappings based on header names.
 * Returns a mapping from CSV header to target field name.
 */
export function autoDetectColumns(
  headers: string[],
  targetFields: string[]
): Record<string, string> {
  const mapping: Record<string, string> = {}
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim())

  const fieldAliases: Record<string, string[]> = {
    date: ["date", "transaction date", "trans date", "posting date", "value date"],
    description: ["description", "desc", "narrative", "details", "memo", "transaction description", "particulars"],
    amount: ["amount", "value", "total", "sum", "net amount"],
    debit: ["debit", "dr", "withdrawal", "withdrawals"],
    credit: ["credit", "cr", "deposit", "deposits"],
    service: ["service", "service name", "product", "resource"],
    currency: ["currency", "cur", "ccy"],
    provider: ["provider", "cloud provider", "vendor", "source"],
    tags: ["tags", "labels", "categories", "tag"],
    name: ["name", "full name", "contact name", "company", "business name"],
    email: ["email", "email address", "e-mail"],
    phone: ["phone", "phone number", "tel", "telephone", "mobile"],
    abn: ["abn", "australian business number", "tax number", "tax id"],
    type: ["type", "contact type", "category"],
    reference: ["reference", "ref", "check number", "cheque number"],
  }

  for (const field of targetFields) {
    const aliases = fieldAliases[field] || [field]
    for (const alias of aliases) {
      const idx = lowerHeaders.indexOf(alias)
      if (idx !== -1 && !Object.values(mapping).includes(field)) {
        mapping[headers[idx]] = field
        break
      }
    }
  }

  return mapping
}
