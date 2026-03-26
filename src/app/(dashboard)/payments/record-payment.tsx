"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Contact {
  id: string
  name: string
}

interface InvoiceOption {
  id: string
  invoiceNumber: string
  contactName: string
  total: number
  amountDue: number | null
  status: string
}

interface BillOption {
  id: string
  billNumber: string
  contactName: string
  total: number
  amountDue: number | null
  status: string
}

export function RecordPayment() {
  const router = useRouter()
  const [paymentType, setPaymentType] = useState<"received" | "made">("received")
  const [invoices, setInvoices] = useState<InvoiceOption[]>([])
  const [bills, setBills] = useState<BillOption[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("")
  const [selectedBillId, setSelectedBillId] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [method, setMethod] = useState("bank_transfer")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    // Fetch outstanding invoices
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInvoices(
            data
              .filter((inv: any) => inv.status !== "Paid" && inv.status !== "Draft" && inv.status !== "Void")
              .map((inv: any) => ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                contactName: inv.contact?.name || "",
                total: inv.total,
                amountDue: inv.amountDue,
                status: inv.status,
              }))
          )
        }
      })

    // Fetch outstanding bills
    fetch("/api/bills")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBills(
            data
              .filter((bill: any) => bill.status !== "Paid" && bill.status !== "Draft" && bill.status !== "Void")
              .map((bill: any) => ({
                id: bill.id,
                billNumber: bill.billNumber,
                contactName: bill.contact?.name || "",
                total: bill.total,
                amountDue: bill.amountDue,
                status: bill.status,
              }))
          )
        }
      })
  }, [])

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId)
  const selectedBill = bills.find((b) => b.id === selectedBillId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than zero.")
      return
    }

    if (paymentType === "received" && !selectedInvoiceId) {
      setError("Please select an invoice to apply the payment to.")
      return
    }
    if (paymentType === "made" && !selectedBillId) {
      setError("Please select a bill to apply the payment to.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: paymentType,
          amount: parsedAmount,
          date,
          reference: reference || null,
          method,
          invoiceId: paymentType === "received" ? selectedInvoiceId : null,
          billId: paymentType === "made" ? selectedBillId : null,
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to record payment.")
        return
      }

      router.refresh()
      setShowForm(false)
      setAmount("")
      setReference("")
      setNotes("")
      setSelectedInvoiceId("")
      setSelectedBillId("")
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Record Payment
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Record Payment</h2>
        <button
          onClick={() => setShowForm(false)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Payment type toggle */}
      <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setPaymentType("received")
            setSelectedBillId("")
          }}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            paymentType === "received"
              ? "bg-white text-green-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Receive Payment
        </button>
        <button
          type="button"
          onClick={() => {
            setPaymentType("made")
            setSelectedInvoiceId("")
          }}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            paymentType === "made"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Make Payment
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Invoice/Bill selection */}
        {paymentType === "received" ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Invoice
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => {
                setSelectedInvoiceId(e.target.value)
                const inv = invoices.find((i) => i.id === e.target.value)
                if (inv) {
                  setAmount(String(inv.amountDue ?? inv.total))
                }
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select an invoice...</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} - {inv.contactName} - Due: ${fmt(inv.amountDue ?? inv.total)}
                </option>
              ))}
            </select>
            {selectedInvoice && (
              <p className="mt-1 text-xs text-slate-500">
                Total: ${fmt(selectedInvoice.total)} | Amount Due: ${fmt(selectedInvoice.amountDue ?? selectedInvoice.total)} | Status: {selectedInvoice.status}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Bill
            </label>
            <select
              value={selectedBillId}
              onChange={(e) => {
                setSelectedBillId(e.target.value)
                const bill = bills.find((b) => b.id === e.target.value)
                if (bill) {
                  setAmount(String(bill.amountDue ?? bill.total))
                }
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a bill...</option>
              {bills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.billNumber} - {bill.contactName} - Due: ${fmt(bill.amountDue ?? bill.total)}
                </option>
              ))}
            </select>
            {selectedBill && (
              <p className="mt-1 text-xs text-slate-500">
                Total: ${fmt(selectedBill.total)} | Amount Due: ${fmt(selectedBill.amountDue ?? selectedBill.total)} | Status: {selectedBill.status}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Amount
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="credit_card">Credit Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional reference..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </form>
    </div>
  )
}
