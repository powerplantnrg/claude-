"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast-store"

interface CostCenter {
  id: string
  code: string
  name: string
  description: string | null
  type: string
  parentId: string | null
  isActive: boolean
  parent: { id: string; name: string; code: string } | null
  children: Array<{ id: string; name: string; code: string }>
  totalSpending?: number
}

interface HierarchyNode extends CostCenter {
  children: HierarchyNode[]
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function TreeNode({ node, depth = 0 }: { node: HierarchyNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Link href={`/cost-centers/${node.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
            {node.code}
          </Link>
          <span className="text-sm text-slate-600">{node.name}</span>
          {!node.isActive && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
          )}
        </div>
        <div className="text-sm text-right">
          <span className="font-medium text-slate-900">${fmt(node.totalSpending ?? 0)}</span>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child as HierarchyNode} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CostCentersPage() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    type: "Department",
    parentId: "",
  })
  const [saving, setSaving] = useState(false)

  const fetchCostCenters = useCallback(async () => {
    try {
      const res = await fetch("/api/cost-centers")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setCostCenters(data.costCenters)
      setHierarchy(data.hierarchy)
    } catch {
      toast.error("Failed to load cost centers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCostCenters()
  }, [fetchCostCenters])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/cost-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          parentId: form.parentId || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create")
      }
      toast.success("Cost center created")
      setShowForm(false)
      setForm({ code: "", name: "", description: "", type: "Department", parentId: "" })
      fetchCostCenters()
    } catch (err: any) {
      toast.error(err.message || "Failed to create cost center")
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

  const totalSpending = costCenters.reduce(
    (sum, c) => sum + (c.totalSpending ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cost Centers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize and track spending by department, project, or team
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Cost Center
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Cost Centers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{costCenters.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {costCenters.filter((c) => c.isActive).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Spending</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">${fmt(totalSpending)}</p>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">New Cost Center</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Code *</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., CC-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Engineering"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option>Department</option>
                  <option>Project</option>
                  <option>Team</option>
                  <option>Division</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Parent Cost Center</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">None (Top Level)</option>
                  {costCenters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Cost Center"}
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

      {/* Hierarchy Tree */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Cost Center Hierarchy</h2>
        </div>
        <div className="p-2">
          {hierarchy.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-slate-400">
              No cost centers found. Create your first cost center to get started.
            </p>
          ) : (
            hierarchy.map((node) => <TreeNode key={node.id} node={node} />)
          )}
        </div>
      </div>
    </div>
  )
}
