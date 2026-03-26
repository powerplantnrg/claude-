/**
 * CSV Export utilities for client-side report downloads.
 */

function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n") || field.includes("\r")) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function generateCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSVField).join(",")
  const dataLines = rows.map((row) => row.map(escapeCSVField).join(","))
  return [headerLine, ...dataLines].join("\r\n")
}

export function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
  const csv = generateCSV(headers, rows)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
