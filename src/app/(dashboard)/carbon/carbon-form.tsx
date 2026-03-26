"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface RdProject {
  id: string
  name: string
}

const COMMON_SOURCES: Record<string, { sources: { name: string; unit: string; factor: number }[] }> = {
  Scope1: {
    sources: [
      { name: "Natural Gas", unit: "m3", factor: 2.0 },
      { name: "Diesel (Generator)", unit: "L", factor: 2.68 },
      { name: "Company Vehicles (Petrol)", unit: "L", factor: 2.31 },
      { name: "Refrigerant Leakage", unit: "kg", factor: 1430 },
    ],
  },
  Scope2: {
    sources: [
      { name: "Electricity (Grid)", unit: "kWh", factor: 0.68 },
      { name: "Electricity (Renewable)", unit: "kWh", factor: 0.0 },
      { name: "Steam/Heating", unit: "kWh", factor: 0.2 },
    ],
  },
  Scope3: {
    sources: [
      { name: "GPU Compute (Cloud)", unit: "GPU-hours", factor: 0.35 },
      { name: "Cloud Data Center", unit: "kWh", factor: 0.5 },
      { name: "Air Travel (Domestic)", unit: "km", factor: 0.255 },
      { name: "Air Travel (International)", unit: "km", factor: 0.195 },
      { name: "Employee Commuting", unit: "km", factor: 0.17 },
      { name: "Software/SaaS", unit: "kWh", factor: 0.5 },
    ],
  },
}

export function CarbonEntryForm({ projects }: { projects: RdProject[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [category, setCategory] = useState("Scope2")
  const [source, setSource] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("")
  const [emissionFactor, setEmissionFactor] = useState("")
  const [cost, setCost] = useState("")
  const [notes, setNotes] = useState("")
  const [projectId, setProjectId] = useState("")

  const totalEmissions = (parseFloat(quantity) || 0) * (parseFloat(emissionFactor) || 0)

  function handleSourcePreset(sourceName: string) {
    const preset = COMMON_SOURCES[category]?.sources.find((s) => s.name === sourceName)
    if (preset) {
      setSource(preset.name)
      setUnit(preset.unit)
      setEmissionFactor(preset.factor.toString())
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const res = await fetch("/api/carbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          category,
          source,
          quantity: parseFloat(quantity),
          unit,
          emissionFactor: parseFloat(emissionFactor),
          cost: cost ? parseFloat(cost) : null,
          notes: notes || null,
          projectId: projectId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create entry")
      }

      setSuccess(true)
      // Reset form
      setSource("")
      setQuantity("")
      setUnit("")
      setEmissionFactor("")
      setCost("")
      setNotes("")
      setProjectId("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const presets = COMMON_SOURCES[category]?.sources || []

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Add Carbon Entry
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Record a new emissions entry
        </p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            Carbon entry created successfully.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Scope Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setSource("")
                setUnit("")
                setEmissionFactor("")
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Scope1">Scope 1 - Direct Emissions</option>
              <option value="Scope2">Scope 2 - Energy Indirect</option>
              <option value="Scope3">Scope 3 - Other Indirect</option>
            </select>
          </div>
        </div>

        {/* Quick Source Presets */}
        {presets.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quick Select Source
            </label>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSourcePreset(p.name)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    source === p.name
                      ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                      : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Source
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
              placeholder="e.g., Electricity, GPU Compute"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quantity
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Unit
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
              placeholder="kWh, km, GPU-hours, L"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Emission Factor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Emission Factor (kg CO2e per unit)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={emissionFactor}
              onChange={(e) => setEmissionFactor(e.target.value)}
              required
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Auto-calculated Total */}
        <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3 border border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Emissions
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {totalEmissions.toFixed(2)} kg CO2e
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            = {quantity || "0"} {unit || "units"} x {emissionFactor || "0"} kg CO2e/{unit || "unit"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Cost */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Associated Cost (optional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="$0.00"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* R&D Project Link */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              R&D Project (optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- No project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Additional details..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Adding..." : "Add Carbon Entry"}
        </button>
      </form>
    </div>
  )
}
