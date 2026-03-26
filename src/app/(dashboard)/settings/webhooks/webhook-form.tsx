"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const WEBHOOK_EVENTS = [
  { value: "invoice.created", label: "Invoice Created" },
  { value: "invoice.sent", label: "Invoice Sent" },
  { value: "invoice.paid", label: "Invoice Paid" },
  { value: "bill.created", label: "Bill Created" },
  { value: "payment.received", label: "Payment Received" },
  { value: "experiment.completed", label: "Experiment Completed" },
  { value: "grant.milestone_due", label: "Grant Milestone Due" },
] as const

export function WebhookForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [secret, setSecret] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState("")
  const [testResult, setTestResult] = useState<string | null>(null)

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    )
  }

  function isValidUrl(str: string): boolean {
    try {
      const parsed = new URL(str)
      return parsed.protocol === "https:" || parsed.protocol === "http:"
    } catch {
      return false
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setTestResult(null)

    if (!name.trim()) {
      setError("Name is required")
      return
    }
    if (!url.trim() || !isValidUrl(url.trim())) {
      setError("A valid HTTP/HTTPS URL is required")
      return
    }
    if (selectedEvents.length === 0) {
      setError("Select at least one event")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          events: selectedEvents.join(","),
          secret: secret.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create webhook")
        return
      }

      setName("")
      setUrl("")
      setSecret("")
      setSelectedEvents([])
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTestResult(null)
    setError("")

    if (!url.trim() || !isValidUrl(url.trim())) {
      setError("Enter a valid URL before testing")
      return
    }

    setTesting(true)
    try {
      const res = await fetch("/api/webhooks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          url: url.trim(),
          secret: secret.trim() || null,
        }),
      })

      if (res.ok) {
        setTestResult("Test payload logged successfully. Check server console for output.")
      } else {
        const data = await res.json()
        setTestResult(`Test failed: ${data.error || "Unknown error"}`)
      }
    } catch {
      setTestResult("Network error during test")
    } finally {
      setTesting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {testResult && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
          {testResult}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wh-name" className="block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="wh-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Slack Notification"
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="wh-url" className="block text-sm font-medium text-slate-700">
            URL
          </label>
          <input
            id="wh-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="wh-secret" className="block text-sm font-medium text-slate-700">
          Secret <span className="text-slate-400">(optional, for HMAC-SHA256 signature verification)</span>
        </label>
        <input
          id="wh-secret"
          type="text"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="whsec_..."
          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Events</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {WEBHOOK_EVENTS.map((event) => (
            <label
              key={event.value}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedEvents.includes(event.value)}
                onChange={() => toggleEvent(event.value)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">{event.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Creating..." : "Create Webhook"}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? "Sending..." : "Test"}
        </button>
      </div>
    </form>
  )
}
