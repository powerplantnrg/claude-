"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "@/lib/toast-store"

interface Reminder {
  id: string
  scheduleType: string
  daysOffset: number
  status: string
  scheduledDate: string
  sentAt: string | null
  emailTo: string | null
  emailSubject: string | null
  templateType: string
  invoice: {
    id: string
    invoiceNumber: string
    total: number
    dueDate: string
    contact: { name: string; email: string | null }
  } | null
}

interface Invoice {
  id: string
  invoiceNumber: string
  total: number
  dueDate: string
  status: string
  contact: { name: string }
}

const statusBadge: Record<string, string> = {
  Scheduled: "bg-blue-100 text-blue-700",
  Sent: "bg-green-100 text-green-700",
  Skipped: "bg-gray-100 text-gray-700",
  Failed: "bg-red-100 text-red-700",
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    invoiceId: "",
    scheduleType: "before_due",
    daysOffset: "7",
    emailTo: "",
    templateType: "standard",
  })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [remindersRes, invoicesRes] = await Promise.all([
        fetch("/api/reminders"),
        fetch("/api/invoices"),
      ])
      if (remindersRes.ok) {
        setReminders(await remindersRes.json())
      }
      if (invoicesRes.ok) {
        const inv = await invoicesRes.json()
        // Only show unpaid invoices for scheduling
        setInvoices(
          (Array.isArray(inv) ? inv : []).filter(
            (i: Invoice) => i.status !== "Paid" && i.status !== "Voided"
          )
        )
      }
    } catch {
      toast.error("Failed to load reminders")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSendDue() {
    setSending(true)
    try {
      const res = await fetch("/api/reminders/send", { method: "POST" })
      if (!res.ok) throw new Error("Failed to send")
      const data = await res.json()
      toast.success(data.message)
      fetchData()
    } catch {
      toast.error("Failed to send reminders")
    } finally {
      setSending(false)
    }
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          daysOffset: parseInt(form.daysOffset),
          emailTo: form.emailTo || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to schedule")
      }
      toast.success("Reminder scheduled")
      setShowForm(false)
      setForm({ invoiceId: "", scheduleType: "before_due", daysOffset: "7", emailTo: "", templateType: "standard" })
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule reminder")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const scheduledCount = reminders.filter((r) => r.status === "Scheduled").length
  const sentCount = reminders.filter((r) => r.status === "Sent").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Reminders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Schedule and manage payment reminders for outstanding invoices
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSendDue}
            disabled={sending}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Due Reminders"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Schedule Reminder
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Scheduled</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{scheduledCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Sent</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{sentCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Reminders</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{reminders.length}</p>
        </div>
      </div>

      {/* Default Schedules Info */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Default Reminder Schedules</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Before Due Date</p>
            <p className="text-sm text-slate-900">7 days before</p>
            <p className="text-xs text-slate-400">Friendly payment reminder</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">On Due Date</p>
            <p className="text-sm text-slate-900">Day of due date</p>
            <p className="text-xs text-slate-400">Payment due today notice</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-600">After Due Date</p>
            <p className="text-sm text-slate-900">7, 14, 30 days after</p>
            <p className="text-xs text-slate-400">Overdue payment follow-up</p>
          </div>
        </div>
      </div>

      {/* Schedule Form */}
      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Schedule New Reminder</h3>
          <form onSubmit={handleSchedule} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Invoice *</label>
                <select
                  required
                  value={form.invoiceId}
                  onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select invoice...</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.contact?.name} (${fmt(inv.total)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Schedule Type *</label>
                <select
                  value={form.scheduleType}
                  onChange={(e) => setForm({ ...form, scheduleType: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="before_due">Before Due Date</option>
                  <option value="on_due">On Due Date</option>
                  <option value="after_due">After Due Date</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Days Offset</label>
                <input
                  type="number"
                  min="0"
                  value={form.daysOffset}
                  onChange={(e) => setForm({ ...form, daysOffset: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email To (override)</label>
                <input
                  type="email"
                  value={form.emailTo}
                  onChange={(e) => setForm({ ...form, emailTo: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Uses contact email by default"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Template</label>
                <select
                  value={form.templateType}
                  onChange={(e) => setForm({ ...form, templateType: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="friendly">Friendly</option>
                  <option value="urgent">Urgent</option>
                  <option value="final_notice">Final Notice</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Scheduling..." : "Schedule Reminder"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reminders List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Invoice</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Scheduled</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Template</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reminders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                  No reminders scheduled yet
                </td>
              </tr>
            ) : (
              reminders.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">
                    {r.invoice?.invoiceNumber || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {r.invoice?.contact?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {r.scheduleType === "before_due"
                      ? `${r.daysOffset}d before`
                      : r.scheduleType === "on_due"
                      ? "On due date"
                      : `${r.daysOffset}d after`}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(r.scheduledDate).toLocaleDateString("en-AU")}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-[150px]">
                    {r.emailTo || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 capitalize">
                    {r.templateType.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusBadge[r.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {r.sentAt ? new Date(r.sentAt).toLocaleDateString("en-AU") : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
