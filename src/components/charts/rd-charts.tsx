"use client"

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { CHART_COLORS, CHART_COLOR_ARRAY } from "./chart-wrapper"

function formatCurrencyShort(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function currencyTooltipFormatter(value: any) {
  const num = Number(value ?? 0)
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// --- R&D Spend by Project Bar Chart ---

interface ProjectSpendData {
  name: string
  spend: number
}

export function RdSpendByProjectChart({ data }: { data: ProjectSpendData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          R&D Spend by Project
        </h3>
        <p className="mt-0.5 text-sm text-slate-500">Total spend per project</p>
      </div>
      <div className="p-6">
        {data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
            No R&D project spend data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={formatCurrencyShort} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: "#64748b" }}
                width={140}
              />
              <Tooltip formatter={currencyTooltipFormatter} />
              <Bar dataKey="spend" name="Spend" fill={CHART_COLORS.indigo} radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

// --- Experiment Status Distribution Pie Chart ---

interface ExperimentStatusData {
  name: string
  value: number
}

const STATUS_COLORS: Record<string, string> = {
  Planned: CHART_COLORS.slate,
  Running: CHART_COLORS.blue,
  Completed: CHART_COLORS.emerald,
  Failed: CHART_COLORS.rose,
}

export function ExperimentStatusChart({ data }: { data: ExperimentStatusData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Experiment Status Distribution
        </h3>
      </div>
      <div className="p-6">
        {data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
            No experiment data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name} (${value})`}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      STATUS_COLORS[entry.name] ??
                      CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
