"use client"

import {
  LineChart,
  Line,
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

function currencyTooltipFormatter(value: unknown) {
  if (value == null) return "$0.00"
  const num = typeof value === "string" ? parseFloat(value) : Number(value)
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// --- Cost Trend Line Chart ---

interface CostTrendData {
  month: string
  total: number
  [provider: string]: string | number
}

export function CostTrendChart({
  data,
  providers,
}: {
  data: CostTrendData[]
  providers: string[]
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Monthly Cloud Cost Trend
        </h3>
        <p className="mt-0.5 text-sm text-slate-500">Cost by provider over time</p>
      </div>
      <div className="p-6">
        {data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
            No cost data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={formatCurrencyShort} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip formatter={currencyTooltipFormatter as any} />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                name="Total"
                stroke={CHART_COLORS.slate}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              {providers.map((provider, idx) => (
                <Line
                  key={provider}
                  type="monotone"
                  dataKey={provider}
                  name={provider}
                  stroke={CHART_COLOR_ARRAY[idx % CHART_COLOR_ARRAY.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

// --- Cost by Provider Donut Chart ---

interface ProviderCostData {
  name: string
  value: number
}

export function CostByProviderChart({ data }: { data: ProviderCostData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Cost by Provider
        </h3>
        <p className="mt-0.5 text-sm text-slate-500">Total spend distribution</p>
      </div>
      <div className="p-6">
        {data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
            No provider cost data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={3}
                dataKey="value"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={({ name, percent }: any) =>
                  `${name ?? ""} (${(((percent as number) ?? 0) * 100).toFixed(0)}%)`
                }
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]}
                  />
                ))}
              </Pie>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip formatter={currencyTooltipFormatter as any} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
