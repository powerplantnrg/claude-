"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface Movement {
  id: string
  type: string
  quantity: number
  unitCost: number
  totalCost: number
  reference: string | null
  date: string
  notes: string | null
}

interface InventoryItem {
  id: string
  sku: string
  name: string
  description: string | null
  category: string
  unitOfMeasure: string
  costPrice: number
  sellingPrice: number
  quantityOnHand: number
  reorderLevel: number | null
  reorderQuantity: number | null
  isTracked: boolean
  isActive: boolean
  location: string | null
  barcode: string | null
  weight: number | null
  notes: string | null
  supplierId: string | null
  account: { id: string; name: string; code: string } | null
  cogsAccount: { id: string; name: string; code: string } | null
  revenueAccount: { id: string; name: string; code: string } | null
  movements: Movement[]
}

const typeBadge: Record<string, string> = {
  Purchase: "bg-green-100 text-green-700",
  Sale: "bg-blue-100 text-blue-700",
  Adjustment: "bg-yellow-100 text-yellow-700",
  Transfer: "bg-purple-100 text-purple-700",
  WriteOff: "bg-red-100 text-red-700",
  Return: "bg-indigo-100 text-indigo-700",
}

export default function InventoryItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  useEffect(() => {
    fetch(`/api/inventory/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setItem(null)
        } else {
          setItem(data)
        }
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id])

  const handleDeactivate = async () => {
    if (!confirm("Are you sure you want to deactivate this item?")) return

    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Item Deactivated", "The inventory item has been deactivated.")
        router.push("/inventory")
      } else {
        toast.error("Error", "Failed to deactivate item.")
      }
    } catch {
      toast.error("Error", "Failed to deactivate item.")
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Loading item...
      </div>
    )
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Inventory item not found.
        </div>
        <Link href="/inventory" className="text-sm text-blue-600 hover:text-blue-800">
          Back to Inventory
        </Link>
      </div>
    )
  }

  const isLow =
    item.isTracked &&
    item.reorderLevel !== null &&
    item.quantityOnHand <= item.reorderLevel

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>
            {item.isActive ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {item.sku} &middot; {item.category} &middot; {item.unitOfMeasure}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {item.isActive && (
            <button
              onClick={handleDeactivate}
              className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 transition-colors"
            >
              Deactivate
            </button>
          )}
          <Link
            href="/inventory"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Quantity on Hand
          </dt>
          <dd className={`mt-2 text-2xl font-bold ${isLow ? "text-red-600" : "text-slate-900"}`}>
            {item.quantityOnHand}
          </dd>
          {isLow && <p className="mt-1 text-xs text-red-500">Below reorder level</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Cost Price
          </dt>
          <dd className="mt-2 text-2xl font-bold text-slate-900">
            ${fmt(item.costPrice)}
          </dd>
          <p className="mt-1 text-xs text-slate-500">Per {item.unitOfMeasure.toLowerCase()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Selling Price
          </dt>
          <dd className="mt-2 text-2xl font-bold text-green-600">
            ${fmt(item.sellingPrice)}
          </dd>
          <p className="mt-1 text-xs text-slate-500">Per {item.unitOfMeasure.toLowerCase()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Stock Value
          </dt>
          <dd className="mt-2 text-2xl font-bold text-indigo-600">
            ${fmt(item.quantityOnHand * item.costPrice)}
          </dd>
          <p className="mt-1 text-xs text-slate-500">At cost</p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Item Details</h2>
          <dl className="space-y-3">
            {item.description && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Description</dt>
                <dd className="mt-1 text-sm text-slate-900">{item.description}</dd>
              </div>
            )}
            {item.location && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Location</dt>
                <dd className="mt-1 text-sm text-slate-900">{item.location}</dd>
              </div>
            )}
            {item.barcode && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Barcode</dt>
                <dd className="mt-1 text-sm text-slate-900 font-mono">{item.barcode}</dd>
              </div>
            )}
            {item.weight !== null && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Weight</dt>
                <dd className="mt-1 text-sm text-slate-900">{item.weight} kg</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-slate-500">Tracking</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {item.isTracked ? "Inventory tracked" : "Not tracked"}
              </dd>
            </div>
            {item.notes && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Notes</dt>
                <dd className="mt-1 text-sm text-slate-900">{item.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Reorder &amp; Accounts</h2>
          <dl className="space-y-3">
            {item.reorderLevel !== null && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Reorder Level</dt>
                <dd className="mt-1 text-sm text-slate-900">{item.reorderLevel}</dd>
              </div>
            )}
            {item.reorderQuantity !== null && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Reorder Quantity</dt>
                <dd className="mt-1 text-sm text-slate-900">{item.reorderQuantity}</dd>
              </div>
            )}
            {item.account && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Inventory Account</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {item.account.code} - {item.account.name}
                </dd>
              </div>
            )}
            {item.cogsAccount && (
              <div>
                <dt className="text-xs font-medium text-slate-500">COGS Account</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {item.cogsAccount.code} - {item.cogsAccount.name}
                </dd>
              </div>
            )}
            {item.revenueAccount && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Revenue Account</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {item.revenueAccount.code} - {item.revenueAccount.name}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Movement History */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Movement History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Quantity
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Unit Cost
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Cost
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reference
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {item.movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                    No movements recorded yet.
                  </td>
                </tr>
              ) : (
                item.movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(m.date).toLocaleDateString("en-AU")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          typeBadge[m.type] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      ${fmt(m.unitCost)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      ${fmt(m.totalCost)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {m.reference || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                      {m.notes || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
