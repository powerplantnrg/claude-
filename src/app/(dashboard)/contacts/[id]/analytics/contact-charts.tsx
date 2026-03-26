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
import { CHART_COLORS } from "@/components/charts/chart-wrapper"

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

// --- Monthly Invoiced/Billed Bar Chart ---

interface MonthlyData {
  month: string
  invoiced: number
  billed: number
}

export function MonthlyInvoiceBillChart({ data }: { data: MonthlyData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">Monthly Invoice / Bill Activity</h3>
        <p className="mt-0.5 text-sm text-slate-500">Last 12 months</p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip formatter={currencyTooltipFormatter} />
            <Legend />
            <Bar dataKey="invoiced" name="Invoiced" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
            <Bar dataKey="billed" name="Billed" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// --- Payment Timeliness Pie Chart ---

interface TimelinessData {
  name: string
  value: number
}

const TIMELINESS_COLORS = [CHART_COLORS.emerald, CHART_COLORS.amber, CHART_COLORS.rose]

export function PaymentTimelinessPieChart({ data }: { data: TimelinessData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">Payment Timeliness</h3>
        <p className="mt-0.5 text-sm text-slate-500">Based on invoice/bill due dates</p>
      </div>
      <div className="p-6">
        {total === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
            No payment data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              >
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={TIMELINESS_COLORS[index % TIMELINESS_COLORS.length]} />
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
