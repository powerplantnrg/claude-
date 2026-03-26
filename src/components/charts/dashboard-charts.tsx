"use client"

import {
  BarChart,
  Bar,
  AreaChart,
  Area,
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

function currencyTooltipFormatter(value: number) {
  return `$${value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// --- Revenue vs Expenses Bar Chart ---

interface RevenueExpenseData {
  month: string
  revenue: number
  expenses: number
}

export function RevenueExpensesChart({ data }: { data: RevenueExpenseData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Revenue vs Expenses
        </h3>
        <p className="mt-0.5 text-sm text-slate-500">Last 6 months</p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={formatCurrencyShort} />
            <Tooltip formatter={currencyTooltipFormatter} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS.indigo} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.rose} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// --- Cash Flow Area Chart ---

interface CashFlowData {
  month: string
  inflow: number
  outflow: number
  net: number
}

export function CashFlowChart({ data }: { data: CashFlowData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">Cash Flow</h3>
        <p className="mt-0.5 text-sm text-slate-500">Monthly inflow, outflow, and net</p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.rose} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.rose} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={formatCurrencyShort} />
            <Tooltip formatter={currencyTooltipFormatter} />
            <Legend />
            <Area type="monotone" dataKey="inflow" name="Inflow" stroke={CHART_COLORS.emerald} fill="url(#colorInflow)" />
            <Area type="monotone" dataKey="outflow" name="Outflow" stroke={CHART_COLORS.rose} fill="url(#colorOutflow)" />
            <Area type="monotone" dataKey="net" name="Net" stroke={CHART_COLORS.blue} fill="none" strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// --- R&D Spend by Category Pie Chart ---

interface RdCategoryData {
  name: string
  value: number
}

export function RdSpendByCategoryChart({ data }: { data: RdCategoryData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          R&D Spend by Category
        </h3>
      </div>
      <div className="p-6">
        {data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
            No R&D expense data available
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
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={currencyTooltipFormatter} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
