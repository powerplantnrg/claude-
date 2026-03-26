"use client"

import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const SCOPE_COLORS: Record<string, string> = {
  Scope1: "#f43f5e",
  Scope2: "#f59e0b",
  Scope3: "#3b82f6",
}

interface ScopeData {
  name: string
  value: number
}

export function EmissionsByScopePie({ data }: { data: ScopeData[] }) {
  if (data.every((d) => d.value === 0)) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Emissions by Scope
          </h3>
        </div>
        <div className="flex items-center justify-center h-[320px] text-sm text-slate-400">
          No emissions data yet
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Emissions by Scope
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          kg CO2e distribution
        </p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }: { name: string; percent?: number }) =>
                `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={SCOPE_COLORS[entry.name] || "#64748b"}
                />
              ))}
            </Pie>
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => `${Number(value ?? 0).toFixed(1)} kg CO2e`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface MonthlyTrendData {
  month: string
  Scope1: number
  Scope2: number
  Scope3: number
  total: number
}

export function MonthlyEmissionsTrend({ data }: { data: MonthlyTrendData[] }) {
  if (data.every((d) => d.total === 0)) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Monthly Emissions Trend
          </h3>
        </div>
        <div className="flex items-center justify-center h-[320px] text-sm text-slate-400">
          No emissions data yet
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Monthly Emissions Trend
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Last 6 months (kg CO2e)
        </p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                `${Number(value ?? 0).toFixed(1)} kg CO2e`,
                String(name),
              ]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Scope1"
              stroke={SCOPE_COLORS.Scope1}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Scope2"
              stroke={SCOPE_COLORS.Scope2}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Scope3"
              stroke={SCOPE_COLORS.Scope3}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
