"use client"

import { useState } from "react"

interface PaymentRow {
  id: string
  date: string
  type: string
  contactName: string
  reference: string
  method: string
  amount: number
  linkedDocument: string
}

export function PaymentsTabs({ payments }: { payments: PaymentRow[] }) {
  const [tab, setTab] = useState<"all" | "received" | "made">("all")

  const filtered =
    tab === "all"
      ? payments
      : payments.filter((p) => p.type === tab)

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Tabs */}
      <div className="border-b border-slate-200 px-6">
        <nav className="-mb-px flex gap-6">
          {(
            [
              { key: "all", label: "All" },
              { key: "received", label: "Received" },
              { key: "made", label: "Made" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 pb-3 pt-4 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {t.label}
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {t.key === "all"
                  ? payments.length
                  : payments.filter((p) => p.type === t.key).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Date
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Type
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contact
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reference
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Method
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Linked Doc
            </th>
            <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                No payments found.
              </td>
            </tr>
          ) : (
            filtered.map((payment) => (
              <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(payment.date).toLocaleDateString("en-AU")}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      payment.type === "received"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {payment.type === "received" ? "Received" : "Made"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">
                  {payment.contactName}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {payment.reference}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {payment.method}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {payment.linkedDocument}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                  <span className={payment.type === "received" ? "text-green-700" : "text-red-700"}>
                    {payment.type === "received" ? "+" : "-"}${fmt(payment.amount)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
