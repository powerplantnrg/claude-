"use client"

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function currencyTooltipFormatter(value: any) {
  const num = Number(value ?? 0)
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface RevenueVsComputeData {
  month: string
  revenue: number
  computeCost: number
}

export function RevenueVsComputeChart({ data }: { data: RevenueVsComputeData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Revenue vs Compute Cost
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Last 6 months</p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
              }
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
              }
            />
            <Tooltip formatter={currencyTooltipFormatter} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Revenue"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="computeCost"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Compute Cost"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface RdClaimTrendData {
  fy: string
  estimatedOffset: number
}

export function RdClaimTrendChart({ data }: { data: RdClaimTrendData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          R&D Tax Offset Estimate by FY
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Based on claim drafts
        </p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="fy" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
              }
            />
            <Tooltip formatter={currencyTooltipFormatter} />
            <Bar
              dataKey="estimatedOffset"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
              name="Estimated Offset"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
