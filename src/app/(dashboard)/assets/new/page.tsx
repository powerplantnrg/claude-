"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface Account {
  id: string
  name: string
  code: string
  type: string
}

interface RdProject {
  id: string
  name: string
}

const categories = [
  { value: "Equipment", label: "Equipment" },
  { value: "Furniture", label: "Furniture" },
  { value: "Vehicles", label: "Vehicles" },
  { value: "IT Hardware", label: "IT Hardware" },
  { value: "Software", label: "Software" },
  { value: "Laboratory", label: "Laboratory" },
  { value: "Building", label: "Building" },
  { value: "Leasehold Improvements", label: "Leasehold Improvements" },
  { value: "Other", label: "Other" },
]

const depreciationMethods = [
  { value: "StraightLine", label: "Straight Line" },
  { value: "DiminishingValue", label: "Diminishing Value" },
]

export default function NewAssetPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [rdProjects, setRdProjects] = useState<RdProject[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Equipment",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: "",
    residualValue: "0",
    usefulLifeYears: "5",
    depreciationMethod: "StraightLine",
    accountId: "",
    depreciationAccountId: "",
    accumulatedDepreciationAccountId: "",
    location: "",
    serialNumber: "",
    supplier: "",
    warrantyExpiry: "",
    isRdAsset: false,
    rdProjectId: "",
    notes: "",
  })

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAccounts(data)
      })
      .catch(() => {})

    fetch("/api/rd/projects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRdProjects(data.map((p: any) => ({ id: p.id, name: p.name })))
        }
      })
      .catch(() => {})
  }, [])

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const assetAccounts = accounts.filter((a) => a.type === "Asset")
  const expenseAccounts = accounts.filter((a) => a.type === "Expense")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!form.name || !form.purchaseDate || !form.purchasePrice || !form.usefulLifeYears) {
      const msg = "Name, purchase date, purchase price, and useful life are required."
      setError(msg)
      toast.error("Validation Error", msg)
      return
    }

    if (parseFloat(form.purchasePrice) <= 0) {
      const msg = "Purchase price must be greater than zero."
      setError(msg)
      toast.error("Validation Error", msg)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          purchasePrice: parseFloat(form.purchasePrice),
          residualValue: parseFloat(form.residualValue || "0"),
          usefulLifeYears: parseInt(form.usefulLifeYears),
          rdProjectId: form.rdProjectId || null,
          warrantyExpiry: form.warrantyExpiry || null,
          accountId: form.accountId || null,
          depreciationAccountId: form.depreciationAccountId || null,
          accumulatedDepreciationAccountId: form.accumulatedDepreciationAccountId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        const errMsg = data.error || "Failed to create asset."
        setError(errMsg)
        toast.error("Failed to Create Asset", errMsg)
        return
      }

      toast.success("Asset Created", "Fixed asset has been added to the register.")
      router.push("/assets")
    } catch {
      setError("An unexpected error occurred.")
      toast.error("Error", "An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Fixed Asset</h1>
          <p className="mt-1 text-sm text-slate-500">
            Register a new fixed asset for tracking and depreciation
          </p>
        </div>
        <Link
          href="/assets"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Asset Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Asset Details</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Asset Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g., MacBook Pro 16-inch"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={2}
                placeholder="Optional description..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="e.g., Office Level 3"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Serial Number
              </label>
              <input
                type="text"
                value={form.serialNumber}
                onChange={(e) => updateField("serialNumber", e.target.value)}
                placeholder="e.g., SN-12345"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Supplier
              </label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => updateField("supplier", e.target.value)}
                placeholder="e.g., Apple Australia"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Warranty Expiry
              </label>
              <input
                type="date"
                value={form.warrantyExpiry}
                onChange={(e) => updateField("warrantyExpiry", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Purchase & Depreciation */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Purchase &amp; Depreciation Settings
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Purchase Date *
              </label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => updateField("purchaseDate", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Purchase Price ($) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) => updateField("purchasePrice", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Residual Value ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.residualValue}
                onChange={(e) => updateField("residualValue", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Useful Life (Years) *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.usefulLifeYears}
                onChange={(e) => updateField("usefulLifeYears", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Depreciation Method
              </label>
              <select
                value={form.depreciationMethod}
                onChange={(e) => updateField("depreciationMethod", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {depreciationMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Account Assignment */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Account Assignment
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Asset Account
              </label>
              <select
                value={form.accountId}
                onChange={(e) => updateField("accountId", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select account...</option>
                {assetAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Depreciation Expense Account
              </label>
              <select
                value={form.depreciationAccountId}
                onChange={(e) => updateField("depreciationAccountId", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select account...</option>
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Accumulated Depreciation Account
              </label>
              <select
                value={form.accumulatedDepreciationAccountId}
                onChange={(e) =>
                  updateField("accumulatedDepreciationAccountId", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select account...</option>
                {assetAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* R&D Linking */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            R&D Tax Incentive
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isRdAsset"
                checked={form.isRdAsset}
                onChange={(e) => updateField("isRdAsset", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isRdAsset" className="text-sm font-medium text-slate-700">
                This asset is used for R&D activities
              </label>
            </div>
            {form.isRdAsset && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  R&D Project
                </label>
                <select
                  value={form.rdProjectId}
                  onChange={(e) => updateField("rdProjectId", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select project...</option>
                  {rdProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Notes</h2>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={3}
            placeholder="Additional notes about this asset..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/assets"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && (
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {submitting ? "Creating..." : "Create Asset"}
          </button>
        </div>
      </form>
    </div>
  )
}
