/**
 * MYOB Data Parser
 * Parses various MYOB CSV/tab-delimited export formats for data migration.
 */

import { parseCSV } from "@/lib/csv-import"

// ============================================
// Types
// ============================================

export interface MYOBAccount {
  accountNumber: string
  accountName: string
  header: string
  accountType: string
  taxCode: string
  openingBalance: number
}

export interface MYOBCard {
  name: string
  cardType: string // Customer, Supplier, Employee, Personal
  address: string
  phone: string
  email: string
  abn: string
  paymentTerms: string
}

export interface MYOBSale {
  invoiceNumber: string
  date: string
  customerName: string
  description: string
  accountNumber: string
  amount: number
  taxCode: string
  status: string
  amountPaid: number
  balanceDue: number
}

export interface MYOBPayrollEntry {
  employee: string
  payDate: string
  grossWages: number
  payg: number
  superannuation: number
  netPay: number
}

export interface MYOBBankStatement {
  date: string
  chequeNumber: string
  memo: string
  amount: number
  accountNumber: string
  cardName: string
  taxCode: string
}

export interface MYOBJournal {
  journalNumber: string
  date: string
  memo: string
  lines: MYOBJournalLine[]
}

export interface MYOBJournalLine {
  accountNumber: string
  accountName: string
  debit: number
  credit: number
  memo: string
  taxCode: string
}

// ============================================
// Helpers
// ============================================

function getColumnIndex(headers: string[], name: string): number {
  const normalized = name.toLowerCase().replace(/[\s_-]/g, "")
  return headers.findIndex(
    (h) => h.toLowerCase().replace(/[\s_-]/g, "") === normalized
  )
}

function getField(row: string[], headers: string[], name: string): string {
  const idx = getColumnIndex(headers, name)
  return idx >= 0 ? (row[idx] ?? "").trim() : ""
}

function getNumericField(
  row: string[],
  headers: string[],
  name: string
): number {
  const val = getField(row, headers, name).replace(/[,$]/g, "")
  const num = parseFloat(val)
  return isNaN(num) ? 0 : num
}

// ============================================
// Parsers
// ============================================

/**
 * Parse MYOB Chart of Accounts export.
 * Expected columns: Account Number, Account Name, Header, AccountType, TaxCode, Opening Balance
 */
export function parseMYOBAccounts(data: string): MYOBAccount[] {
  const { headers, rows } = parseCSV(data)
  return rows.map((row) => ({
    accountNumber: getField(row, headers, "Account Number"),
    accountName: getField(row, headers, "Account Name"),
    header: getField(row, headers, "Header"),
    accountType: getField(row, headers, "AccountType"),
    taxCode: getField(row, headers, "TaxCode"),
    openingBalance: getNumericField(row, headers, "Opening Balance"),
  }))
}

/**
 * Parse MYOB Cards (Contacts) export.
 * Expected columns: Name, CardType, Address, Phone, Email, ABN, PaymentTerms
 */
export function parseMYOBCards(data: string): MYOBCard[] {
  const { headers, rows } = parseCSV(data)
  return rows.map((row) => ({
    name: getField(row, headers, "Name"),
    cardType: getField(row, headers, "CardType"),
    address: getField(row, headers, "Address"),
    phone: getField(row, headers, "Phone"),
    email: getField(row, headers, "Email"),
    abn: getField(row, headers, "ABN"),
    paymentTerms: getField(row, headers, "PaymentTerms"),
  }))
}

/**
 * Parse MYOB Sales/Purchases export.
 * Handles both sales invoices and purchase bills.
 */
export function parseMYOBSales(data: string): MYOBSale[] {
  const { headers, rows } = parseCSV(data)
  return rows.map((row) => ({
    invoiceNumber: getField(row, headers, "Invoice Number") || getField(row, headers, "InvoiceNumber"),
    date: getField(row, headers, "Date"),
    customerName: getField(row, headers, "Customer Name") || getField(row, headers, "Supplier Name") || getField(row, headers, "Name"),
    description: getField(row, headers, "Description") || getField(row, headers, "Memo"),
    accountNumber: getField(row, headers, "Account Number"),
    amount: getNumericField(row, headers, "Amount") || getNumericField(row, headers, "Total"),
    taxCode: getField(row, headers, "Tax Code") || getField(row, headers, "TaxCode"),
    status: getField(row, headers, "Status"),
    amountPaid: getNumericField(row, headers, "Amount Paid"),
    balanceDue: getNumericField(row, headers, "Balance Due"),
  }))
}

/**
 * Parse MYOB Payroll export.
 * Expected columns: Employee, GrossWages, PAYG, Super, NetPay
 */
export function parseMYOBPayroll(data: string): MYOBPayrollEntry[] {
  const { headers, rows } = parseCSV(data)
  return rows.map((row) => ({
    employee: getField(row, headers, "Employee"),
    payDate: getField(row, headers, "Pay Date") || getField(row, headers, "Date"),
    grossWages: getNumericField(row, headers, "Gross Wages") || getNumericField(row, headers, "GrossWages"),
    payg: getNumericField(row, headers, "PAYG") || getNumericField(row, headers, "Tax"),
    superannuation: getNumericField(row, headers, "Super") || getNumericField(row, headers, "Superannuation"),
    netPay: getNumericField(row, headers, "Net Pay") || getNumericField(row, headers, "NetPay"),
  }))
}

/**
 * Parse MYOB Bank Register / Bank Statements export.
 */
export function parseMYOBBankStatements(data: string): MYOBBankStatement[] {
  const { headers, rows } = parseCSV(data)
  return rows.map((row) => ({
    date: getField(row, headers, "Date"),
    chequeNumber: getField(row, headers, "Cheque Number") || getField(row, headers, "ChequeNo"),
    memo: getField(row, headers, "Memo") || getField(row, headers, "Description"),
    amount: getNumericField(row, headers, "Amount"),
    accountNumber: getField(row, headers, "Account Number"),
    cardName: getField(row, headers, "Card Name") || getField(row, headers, "Name"),
    taxCode: getField(row, headers, "Tax Code") || getField(row, headers, "TaxCode"),
  }))
}

/**
 * Parse MYOB General Journal export.
 * Groups journal lines under the same Journal Number.
 */
export function parseMYOBJournals(data: string): MYOBJournal[] {
  const { headers, rows } = parseCSV(data)
  const journalMap = new Map<string, MYOBJournal>()

  for (const row of rows) {
    const journalNumber = getField(row, headers, "Journal Number") || getField(row, headers, "JournalNumber")
    if (!journalNumber) continue

    const line: MYOBJournalLine = {
      accountNumber: getField(row, headers, "Account Number"),
      accountName: getField(row, headers, "Account Name"),
      debit: getNumericField(row, headers, "Debit"),
      credit: getNumericField(row, headers, "Credit"),
      memo: getField(row, headers, "Memo"),
      taxCode: getField(row, headers, "Tax Code") || getField(row, headers, "TaxCode"),
    }

    const existing = journalMap.get(journalNumber)
    if (existing) {
      existing.lines.push(line)
    } else {
      journalMap.set(journalNumber, {
        journalNumber,
        date: getField(row, headers, "Date"),
        memo: getField(row, headers, "Memo"),
        lines: [line],
      })
    }
  }

  return Array.from(journalMap.values())
}
