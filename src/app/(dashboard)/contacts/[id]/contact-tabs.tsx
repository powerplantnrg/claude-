"use client"

import { useState } from "react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Invoice {
  id: string
  invoiceNumber: string
  date: string | Date
  dueDate: string | Date
  status: string
  total: number
}

interface Bill {
  id: string
  billNumber: string
  date: string | Date
  dueDate: string | Date
  status: string
  total: number
}

interface PaymentRecord {
  id: string
  type: string
  amount: number
  date: string | Date
  reference: string | null
  method: string
  invoiceId: string | null
  billId: string | null
  notes: string | null
}

interface ContactTabsProps {
  contactId: string
  invoices: Invoice[]
  bills: Bill[]
  payments: PaymentRecord[]
  totalInvoiced: number
  totalBilled: number
  outstandingReceivable: number
  outstandingPayable: number
  totalPaid: number
}

const statusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-blue-100 text-blue-700",
  Received: "bg-blue-100 text-blue-700",
  Overdue: "bg-red-100 text-red-700",
  Paid: "bg-green-100 text-green-700",
  Voided: "bg-slate-100 text-slate-400",
  Void: "bg-slate-100 text-slate-400",
}

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "invoices", label: "Invoices" },
  { key: "bills", label: "Bills" },
  { key: "payments", label: "Payments" },
] as const

type TabKey = (typeof tabs)[number]["key"]

export function ContactTabs({
  contactId,
  invoices,
  bills,
  payments,
  totalInvoiced,
  totalBilled,
  outstandingReceivable,
  outstandingPayable,
  totalPaid,
}: ContactTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview")

  return (
    <div>
      {/* Tab Bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.key === "invoices" && invoices.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {invoices.length}
                </span>
              )}
              {tab.key === "bills" && bills.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {bills.length}
                </span>
              )}
              {tab.key === "payments" && payments.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {payments.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-500">Total Invoiced</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalInvoiced)}</p>
                <p className="text-xs text-slate-400">{invoices.length} invoices</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-500">Total Billed</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalBilled)}</p>
                <p className="text-xs text-slate-400">{bills.length} bills</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-medium text-emerald-600">Outstanding Receivable</p>
                <p className="mt-1 text-xl font-bold text-emerald-700">{formatCurrency(outstandingReceivable)}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
                <p className="text-sm font-medium text-rose-600">Outstanding Payable</p>
                <p className="mt-1 text-xl font-bold text-rose-700">{formatCurrency(outstandingPayable)}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-sm font-medium text-blue-600">Total Payments</p>
                <p className="mt-1 text-xl font-bold text-blue-700">{formatCurrency(totalPaid)}</p>
                <p className="text-xs text-blue-500">{payments.length} payments</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Recent Invoices</h3>
              </div>
              {invoices.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400">No invoices yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Number</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.slice(0, 5).map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm font-medium text-slate-900">
                            <Link href={`/invoices/${inv.id}`} className="hover:text-indigo-600">
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600">{formatDate(inv.date)}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[inv.status] || "bg-slate-100 text-slate-700"}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-900">
                            {formatCurrency(inv.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Recent Bills</h3>
              </div>
              {bills.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400">No bills yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Number</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bills.slice(0, 5).map((bill) => (
                        <tr key={bill.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm font-medium text-slate-900">
                            <Link href={`/bills/${bill.id}`} className="hover:text-indigo-600">
                              {bill.billNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600">{formatDate(bill.date)}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[bill.status] || "bg-slate-100 text-slate-700"}`}>
                              {bill.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-900">
                            {formatCurrency(bill.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "invoices" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">All Invoices</h3>
              <Link
                href={`/invoices/new?contactId=${contactId}`}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Invoice
              </Link>
            </div>
            {invoices.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
                <p className="text-sm text-slate-500">No invoices for this contact</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Number</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Due Date</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm font-medium text-slate-900">
                            <Link href={`/invoices/${inv.id}`} className="hover:text-indigo-600">
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600">{formatDate(inv.date)}</td>
                          <td className="px-6 py-3 text-sm text-slate-600">{formatDate(inv.dueDate)}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[inv.status] || "bg-slate-100 text-slate-700"}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-900">
                            {formatCurrency(inv.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "bills" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">All Bills</h3>
              <Link
                href={`/bills/new?contactId=${contactId}`}
                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Bill
              </Link>
            </div>
            {bills.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
                <p className="text-sm text-slate-500">No bills for this contact</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Number</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Due Date</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm font-medium text-slate-900">
                            <Link href={`/bills/${bill.id}`} className="hover:text-indigo-600">
                              {bill.billNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600">{formatDate(bill.date)}</td>
                          <td className="px-6 py-3 text-sm text-slate-600">{formatDate(bill.dueDate)}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[bill.status] || "bg-slate-100 text-slate-700"}`}>
                              {bill.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-900">
                            {formatCurrency(bill.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Payment History</h3>
            {payments.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
                <p className="text-sm text-slate-500">No payment records for this contact</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Method</th>
                        <th className="px-6 py-3">Reference</th>
                        <th className="px-6 py-3">Linked To</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm text-slate-600">{formatDate(payment.date)}</td>
                          <td className="px-6 py-3 text-sm">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              payment.type === "received"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {payment.type === "received" ? "Received" : "Made"}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600 capitalize">
                            {payment.method.replace(/_/g, " ")}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600">
                            {payment.reference || "\u2014"}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600">
                            {payment.invoiceId ? (
                              <Link href={`/invoices/${payment.invoiceId}`} className="text-indigo-600 hover:text-indigo-800">
                                Invoice
                              </Link>
                            ) : payment.billId ? (
                              <Link href={`/bills/${payment.billId}`} className="text-indigo-600 hover:text-indigo-800">
                                Bill
                              </Link>
                            ) : (
                              "\u2014"
                            )}
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-900">
                            {formatCurrency(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
