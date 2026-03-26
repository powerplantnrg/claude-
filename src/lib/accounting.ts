export interface JournalLine {
  accountId: string
  debit: number
  credit: number
  description?: string
}

export interface InvoiceLine {
  description: string
  quantity: number
  unitPrice: number
  accountId: string
  taxType: "GST" | "GST-Free" | "BAS-Excluded"
}

export interface Invoice {
  id: string
  contactId: string
  date: string
  dueDate: string
  reference?: string
}

export interface Bill {
  id: string
  contactId: string
  date: string
  dueDate: string
  reference?: string
}

const ACCOUNTS_RECEIVABLE_ID = "accounts-receivable"
const ACCOUNTS_PAYABLE_ID = "accounts-payable"
const GST_COLLECTED_ID = "gst-collected"
const GST_PAID_ID = "gst-paid"

/**
 * Validates a journal entry by checking that total debits equal total credits.
 */
export function validateJournalEntry(
  lines: { debit: number; credit: number }[]
): boolean {
  const totalDebits = lines.reduce((sum, line) => sum + line.debit, 0)
  const totalCredits = lines.reduce((sum, line) => sum + line.credit, 0)

  // Use rounding to handle floating point precision issues
  return Math.abs(totalDebits - totalCredits) < 0.005
}

/**
 * Calculates GST components from a gross or net amount.
 */
export function calculateGST(
  amount: number,
  rate: number
): { netAmount: number; gstAmount: number; grossAmount: number } {
  const netAmount = round(amount, 2)
  const gstAmount = round(netAmount * rate, 2)
  const grossAmount = round(netAmount + gstAmount, 2)

  return { netAmount, gstAmount, grossAmount }
}

/**
 * Generates journal entry lines for an invoice.
 * Debits Accounts Receivable for the gross total.
 * Credits each Revenue account for the net line amount.
 * Credits GST Collected for any GST on taxable lines.
 */
export function createInvoiceJournalEntry(
  invoice: Invoice,
  lines: InvoiceLine[],
  orgId: string
): JournalLine[] {
  const journalLines: JournalLine[] = []
  let totalGross = 0

  for (const line of lines) {
    const lineTotal = round(line.quantity * line.unitPrice, 2)

    if (line.taxType === "GST") {
      const { netAmount, gstAmount, grossAmount } = calculateGST(lineTotal, 0.1)
      totalGross += grossAmount

      // Credit the revenue account for the net amount
      journalLines.push({
        accountId: line.accountId,
        debit: 0,
        credit: netAmount,
        description: line.description,
      })

      // Credit GST collected
      journalLines.push({
        accountId: GST_COLLECTED_ID,
        debit: 0,
        credit: gstAmount,
        description: `GST on ${line.description}`,
      })
    } else {
      totalGross += lineTotal

      journalLines.push({
        accountId: line.accountId,
        debit: 0,
        credit: lineTotal,
        description: line.description,
      })
    }
  }

  // Debit Accounts Receivable for the gross total
  journalLines.unshift({
    accountId: ACCOUNTS_RECEIVABLE_ID,
    debit: totalGross,
    credit: 0,
    description: `Invoice ${invoice.reference ?? invoice.id} - ${invoice.contactId}`,
  })

  return journalLines
}

/**
 * Generates journal entry lines for a bill.
 * Credits Accounts Payable for the gross total.
 * Debits each Expense account for the net line amount.
 * Debits GST Paid for any GST on taxable lines.
 */
export function createBillJournalEntry(
  bill: Bill,
  lines: InvoiceLine[],
  orgId: string
): JournalLine[] {
  const journalLines: JournalLine[] = []
  let totalGross = 0

  for (const line of lines) {
    const lineTotal = round(line.quantity * line.unitPrice, 2)

    if (line.taxType === "GST") {
      const { netAmount, gstAmount, grossAmount } = calculateGST(lineTotal, 0.1)
      totalGross += grossAmount

      // Debit the expense account for the net amount
      journalLines.push({
        accountId: line.accountId,
        debit: netAmount,
        credit: 0,
        description: line.description,
      })

      // Debit GST paid
      journalLines.push({
        accountId: GST_PAID_ID,
        debit: gstAmount,
        credit: 0,
        description: `GST on ${line.description}`,
      })
    } else {
      totalGross += lineTotal

      journalLines.push({
        accountId: line.accountId,
        debit: lineTotal,
        credit: 0,
        description: line.description,
      })
    }
  }

  // Credit Accounts Payable for the gross total
  journalLines.push({
    accountId: ACCOUNTS_PAYABLE_ID,
    debit: 0,
    credit: totalGross,
    description: `Bill ${bill.reference ?? bill.id} - ${bill.contactId}`,
  })

  return journalLines
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
