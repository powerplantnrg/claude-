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

const categories = [
  { value: "General", label: "General" },
  { value: "Raw Materials", label: "Raw Materials" },
  { value: "Finished Goods", label: "Finished Goods" },
  { value: "Components", label: "Components" },
  { value: "Consumables", label: "Consumables" },
  { value: "Packaging", label: "Packaging" },
  { value: "Lab Supplies", label: "Lab Supplies" },
  { value: "Electronics", label: "Electronics" },
  { value: "Chemicals", label: "Chemicals" },
  { value: "Other", label: "Other" },
]

const units = [
  "Each",
  "Kg",
  "g",
  "L",
  "mL",
  "m",
  "cm",
  "Box",
  "Pack",
  "Roll",
  "Sheet",
  "Pair",
  "Set",
  "Dozen",
  "Other",
]

export default function NewInventoryItemPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "General",
    unitOfMeasure: "Each",
    costPrice: "",
    sellingPrice: "",
    taxRateId: "",
    accountId: "",
    cogsAccountId: "",
    revenueAccountId: "",
    quantityOnHand: "0",
    reorderLevel: "",
    reorderQuantity: "",
    isTracked: true,
    supplierId: "",
    location: "",
    barcode: "",
    weight: "",
    notes: "",
  })

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAccounts(data)
      })
      .catch(() => {})
  }, [])

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const assetAccounts = accounts.filter((a) => a.type === "Asset")
  const expenseAccounts = accounts.filter((a) => a.type === "Expense" || a.type === "CostOfSales")
  const revenueAccounts = accounts.filter((a) => a.type === "Revenue")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!form.name) {
      const msg = "Name is required."
      setError(msg)
      toast.error("Validation Error", msg)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          costPrice: form.costPrice ? parseFloat(form.costPrice) : 0,
          sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : 0,
          quantityOnHand: form.quantityOnHand ? parseInt(form.quantityOnHand) : 0,
          reorderLevel: form.reorderLevel ? parseInt(form.reorderLevel) : null,
          reorderQuantity: form.reorderQuantity ? parseInt(form.reorderQuantity) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          accountId: form.accountId || null,
          cogsAccountId: form.cogsAccountId || null,
          revenueAccountId: form.revenueAccountId || null,
          taxRateId: form.taxRateId || null,
          supplierId: form.supplierId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        const errMsg = data.error || "Failed to create item."
        setError(errMsg)
        toast.error("Failed to Create Item", errMsg)
        return
      }

      toast.success("Item Created", "Inventory item has been added.")
      router.push("/inventory")
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
          <h1 className="text-2xl font-bold text-slate-900">Add Inventory Item</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a new inventory item for tracking and management
          </p>
        </div>
        <Link
          href="/inventory"
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
        {/* Item Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Item Details</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Item Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g., Widget Assembly Kit"
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
                Unit of Measure
              </label>
              <select
                value={form.unitOfMeasure}
                onChange={(e) => updateField("unitOfMeasure", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
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
                placeholder="e.g., Warehouse A, Shelf 3"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Barcode
              </label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => updateField("barcode", e.target.value)}
                placeholder="e.g., 1234567890123"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Weight (kg)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.weight}
                onChange={(e) => updateField("weight", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Pricing</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cost Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => updateField("costPrice", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Selling Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) => updateField("sellingPrice", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tracking Settings */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Tracking Settings</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="isTracked"
                checked={form.isTracked}
                onChange={(e) => updateField("isTracked", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isTracked" className="text-sm font-medium text-slate-700">
                Track inventory quantity for this item
              </label>
            </div>
            {form.isTracked && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Initial Quantity on Hand
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantityOnHand}
                    onChange={(e) => updateField("quantityOnHand", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.reorderLevel}
                    onChange={(e) => updateField("reorderLevel", e.target.value)}
                    placeholder="Trigger reorder alert"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Reorder Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.reorderQuantity}
                    onChange={(e) => updateField("reorderQuantity", e.target.value)}
                    placeholder="Suggested order quantity"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Account Assignment */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Account Assignment</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Inventory Account
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
                COGS Account
              </label>
              <select
                value={form.cogsAccountId}
                onChange={(e) => updateField("cogsAccountId", e.target.value)}
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
                Revenue Account
              </label>
              <select
                value={form.revenueAccountId}
                onChange={(e) => updateField("revenueAccountId", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select account...</option>
                {revenueAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Notes</h2>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={3}
            placeholder="Additional notes about this item..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/inventory"
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
            {submitting ? "Creating..." : "Create Item"}
          </button>
        </div>
      </form>
    </div>
  )
}
