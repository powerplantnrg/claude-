/**
 * Xero Data Parser
 * Parses various Xero CSV export formats for data migration.
 */

import { parseCSV, type ParsedCSV } from "@/lib/csv-import"

// ============================================
// Types
// ============================================

export interface XeroAccount {
  code: string
  name: string
  type: string
  taxType: string
  description: string
  enablePayments: boolean
}

export interface XeroContact {
  contactName: string
  emailAddress: string
  firstName: string
  lastName: string
  bankAccountName: string
  bankAccountNumber: string
  bankAccountParticulars: string
  taxNumber: string
  accountsReceivableTaxType: string
  accountsPayableTaxType: string
  street: string
  city: string
  region: string
  postalCode: string
  country: string
  phone: string
  fax: string
  mobile: string
  website: string
}

export interface XeroInvoiceLine {
  lineDescription: string
  lineQuantity: number
  lineUnitAmount: number
  lineAccountCode: string
  lineTaxType: string
}

export interface XeroInvoice {
  invoiceNumber: string
  reference: string
  invoiceDate: string
  dueDate: string
  total: number
  tax: number
  invoiceAmountPaid: number
  invoiceAmountDue: number
  status: string
  contactName: string
  lines: XeroInvoiceLine[]
}

export interface XeroBankTransaction {
  date: string
  amount: number
  payee: string
  description: string
  reference: string
  accountCode: string
  taxType: string
}

export interface XeroPayrollEntry {
  employeeName: string
  payDate: string
  grossPay: number
  tax: number
  superannuation: number
  netPay: number
  hoursWorked: number
  payRate: number
}

export interface XeroFixedAsset {
  assetName: string
  assetNumber: string
  purchaseDate: string
  purchasePrice: number
  assetType: string
  depreciationMethod: string
  effectiveLife: number
  bookValue: number
  accumulatedDepreciation: number
  disposalDate: string
  disposalPrice: number
}

export interface XeroInventoryItem {
  itemCode: string
  itemName: string
  purchaseDescription: string
  purchaseUnitPrice: number
  purchaseAccountCode: string
  purchaseTaxType: string
  salesDescription: string
  salesUnitPrice: number
  salesAccountCode: string
  salesTaxType: string
  quantityOnHand: number
  totalValue: number
  isSold: boolean
  isPurchased: boolean
}

export interface XeroJournalEntry {
  journalNumber: string
  journalDate: string
  description: string
  lines: XeroJournalLine[]
}

export interface XeroJournalLine {
  accountCode: string
  accountName: string
  debit: number
  credit: number
  description: string
  taxType: string
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

function getBooleanField(
  row: string[],
  headers: string[],
  name: string
): boolean {
  const val = getField(row, headers, name).toLowerCase()
  return val === "true" || val === "yes" || val === "y" || val === "1"
}

// ============================================
// Parsers
// ============================================

/**
 * Parse Xero Chart of Accounts CSV export.
 * Expected columns: Code, Name, Type, TaxType, Description, EnablePayments
 */
export function parseXeroAccounts(csvData: string): XeroAccount[] {
  const { headers, rows } = parseCSV(csvData)
  return rows.map((row) => ({
    code: getField(row, headers, "Code"),
    name: getField(row, headers, "Name"),
    type: getField(row, headers, "Type"),
    taxType: getField(row, headers, "TaxType"),
    description: getField(row, headers, "Description"),
    enablePayments: getBooleanField(row, headers, "EnablePayments"),
  }))
}

/**
 * Parse Xero Contacts CSV export.
 */
export function parseXeroContacts(csvData: string): XeroContact[] {
  const { headers, rows } = parseCSV(csvData)
  return rows.map((row) => ({
    contactName: getField(row, headers, "ContactName"),
    emailAddress: getField(row, headers, "EmailAddress"),
    firstName: getField(row, headers, "FirstName"),
    lastName: getField(row, headers, "LastName"),
    bankAccountName: getField(row, headers, "BankAccountName"),
    bankAccountNumber: getField(row, headers, "BankAccountNumber"),
    bankAccountParticulars: getField(row, headers, "BankAccountParticulars"),
    taxNumber: getField(row, headers, "TaxNumber"),
    accountsReceivableTaxType: getField(
      row,
      headers,
      "AccountsReceivableTaxType"
    ),
    accountsPayableTaxType: getField(row, headers, "AccountsPayableTaxType"),
    street: getField(row, headers, "Street"),
    city: getField(row, headers, "City"),
    region: getField(row, headers, "Region"),
    postalCode: getField(row, headers, "PostalCode"),
    country: getField(row, headers, "Country"),
    phone: getField(row, headers, "Phone"),
    fax: getField(row, headers, "Fax"),
    mobile: getField(row, headers, "Mobile"),
    website: getField(row, headers, "Website"),
  }))
}

/**
 * Parse Xero Invoice CSV export.
 * Groups line items under the same InvoiceNumber into a single invoice.
 */
export function parseXeroInvoices(csvData: string): XeroInvoice[] {
  const { headers, rows } = parseCSV(csvData)
  const invoiceMap = new Map<string, XeroInvoice>()

  for (const row of rows) {
    const invoiceNumber = getField(row, headers, "InvoiceNumber")
    if (!invoiceNumber) continue

    const line: XeroInvoiceLine = {
      lineDescription: getField(row, headers, "LineDescription"),
      lineQuantity: getNumericField(row, headers, "LineQuantity"),
      lineUnitAmount: getNumericField(row, headers, "LineUnitAmount"),
      lineAccountCode: getField(row, headers, "LineAccountCode"),
      lineTaxType: getField(row, headers, "LineTaxType"),
    }

    const existing = invoiceMap.get(invoiceNumber)
    if (existing) {
      existing.lines.push(line)
    } else {
      invoiceMap.set(invoiceNumber, {
        invoiceNumber,
        reference: getField(row, headers, "Reference"),
        invoiceDate: getField(row, headers, "InvoiceDate"),
        dueDate: getField(row, headers, "DueDate"),
        total: getNumericField(row, headers, "Total"),
        tax: getNumericField(row, headers, "Tax"),
        invoiceAmountPaid: getNumericField(row, headers, "InvoiceAmountPaid"),
        invoiceAmountDue: getNumericField(row, headers, "InvoiceAmountDue"),
        status: getField(row, headers, "Status"),
        contactName: getField(row, headers, "ContactName"),
        lines: [line],
      })
    }
  }

  return Array.from(invoiceMap.values())
}

/**
 * Parse Xero Bills CSV export (same format as invoices).
 */
export function parseXeroBills(csvData: string): XeroInvoice[] {
  return parseXeroInvoices(csvData)
}

/**
 * Parse Xero Bank Statement / Bank Transactions CSV export.
 */
export function parseXeroBankTransactions(
  csvData: string
): XeroBankTransaction[] {
  const { headers, rows } = parseCSV(csvData)
  return rows.map((row) => ({
    date: getField(row, headers, "Date"),
    amount: getNumericField(row, headers, "Amount"),
    payee: getField(row, headers, "Payee"),
    description: getField(row, headers, "Description"),
    reference: getField(row, headers, "Reference"),
    accountCode: getField(row, headers, "AccountCode"),
    taxType: getField(row, headers, "TaxType"),
  }))
}

/**
 * Parse Xero Payroll summary CSV export.
 */
export function parseXeroPayroll(csvData: string): XeroPayrollEntry[] {
  const { headers, rows } = parseCSV(csvData)
  return rows.map((row) => ({
    employeeName: getField(row, headers, "EmployeeName"),
    payDate: getField(row, headers, "PayDate"),
    grossPay: getNumericField(row, headers, "GrossPay"),
    tax: getNumericField(row, headers, "Tax"),
    superannuation: getNumericField(row, headers, "Superannuation"),
    netPay: getNumericField(row, headers, "NetPay"),
    hoursWorked: getNumericField(row, headers, "HoursWorked"),
    payRate: getNumericField(row, headers, "PayRate"),
  }))
}

/**
 * Parse Xero Fixed Assets register CSV export.
 */
export function parseXeroFixedAssets(csvData: string): XeroFixedAsset[] {
  const { headers, rows } = parseCSV(csvData)
  return rows.map((row) => ({
    assetName: getField(row, headers, "AssetName"),
    assetNumber: getField(row, headers, "AssetNumber"),
    purchaseDate: getField(row, headers, "PurchaseDate"),
    purchasePrice: getNumericField(row, headers, "PurchasePrice"),
    assetType: getField(row, headers, "AssetType"),
    depreciationMethod: getField(row, headers, "DepreciationMethod"),
    effectiveLife: getNumericField(row, headers, "EffectiveLife"),
    bookValue: getNumericField(row, headers, "BookValue"),
    accumulatedDepreciation: getNumericField(
      row,
      headers,
      "AccumulatedDepreciation"
    ),
    disposalDate: getField(row, headers, "DisposalDate"),
    disposalPrice: getNumericField(row, headers, "DisposalPrice"),
  }))
}

/**
 * Parse Xero Inventory Items CSV export.
 */
export function parseXeroInventory(csvData: string): XeroInventoryItem[] {
  const { headers, rows } = parseCSV(csvData)
  return rows.map((row) => ({
    itemCode: getField(row, headers, "ItemCode"),
    itemName: getField(row, headers, "ItemName"),
    purchaseDescription: getField(row, headers, "PurchaseDescription"),
    purchaseUnitPrice: getNumericField(row, headers, "PurchaseUnitPrice"),
    purchaseAccountCode: getField(row, headers, "PurchaseAccountCode"),
    purchaseTaxType: getField(row, headers, "PurchaseTaxType"),
    salesDescription: getField(row, headers, "SalesDescription"),
    salesUnitPrice: getNumericField(row, headers, "SalesUnitPrice"),
    salesAccountCode: getField(row, headers, "SalesAccountCode"),
    salesTaxType: getField(row, headers, "SalesTaxType"),
    quantityOnHand: getNumericField(row, headers, "QuantityOnHand"),
    totalValue: getNumericField(row, headers, "TotalValue"),
    isSold: getBooleanField(row, headers, "IsSold"),
    isPurchased: getBooleanField(row, headers, "IsPurchased"),
  }))
}

/**
 * Parse Xero Manual Journals CSV export.
 * Groups journal lines under the same JournalNumber.
 */
export function parseXeroJournalEntries(csvData: string): XeroJournalEntry[] {
  const { headers, rows } = parseCSV(csvData)
  const journalMap = new Map<string, XeroJournalEntry>()

  for (const row of rows) {
    const journalNumber = getField(row, headers, "JournalNumber")
    if (!journalNumber) continue

    const line: XeroJournalLine = {
      accountCode: getField(row, headers, "AccountCode"),
      accountName: getField(row, headers, "AccountName"),
      debit: getNumericField(row, headers, "Debit"),
      credit: getNumericField(row, headers, "Credit"),
      description: getField(row, headers, "Description"),
      taxType: getField(row, headers, "TaxType"),
    }

    const existing = journalMap.get(journalNumber)
    if (existing) {
      existing.lines.push(line)
    } else {
      journalMap.set(journalNumber, {
        journalNumber,
        journalDate: getField(row, headers, "JournalDate"),
        description: getField(row, headers, "Narration"),
        lines: [line],
      })
    }
  }

  return Array.from(journalMap.values())
}
