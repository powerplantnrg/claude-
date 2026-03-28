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
  ResponsiveContainer,
} from "recharts"
import {
  ChartWrapper,
  PremiumTooltip,
  CHART_COLORS,
  GRADIENT_PAIRS,
  formatCurrencyShort,
  currencyTooltipFormatter,
} from "@/components/charts/chart-wrapper"

// ─── Monthly Invoice / Bill Activity ──────────────────────────────────

interface MonthlyData {
  month: string
  invoiced: number
  billed: number
}

export function MonthlyInvoiceBillChart({ data }: { data: MonthlyData[] }) {
  return (
    <ChartWrapper
      title="Monthly Invoice / Bill Activity"
      subtitle="Last 12 months"
      accentColor={CHART_COLORS.emerald}
    >
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
        <defs>
          <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickFormatter={formatCurrencyShort}
          width={55}
        />
        <Tooltip content={<PremiumTooltip formatter={currencyTooltipFormatter} />} />
        <Bar dataKey="invoiced" name="Invoiced" fill="url(#invoicedGrad)" radius={[6, 6, 2, 2]} maxBarSize={28} />
        <Bar dataKey="billed" name="Billed" fill="url(#billedGrad)" radius={[6, 6, 2, 2]} maxBarSize={28} />
      </BarChart>
    </ChartWrapper>
  )
}

// ─── Payment Timeliness (Premium Donut) ───────────────────────────────

interface TimelinessData {
  name: string
  value: number
}

const TIMELINESS_GRADIENTS = [
  { from: "#10b981", to: "#34d399" },
  { from: "#f59e0b", to: "#fbbf24" },
  { from: "#f43f5e", to: "#fb7185" },
]

export function PaymentTimelinessPieChart({ data }: { data: TimelinessData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ChartWrapper
      title="Payment Timeliness"
      subtitle="Based on invoice/bill due dates"
      accentColor={CHART_COLORS.amber}
    >
      {total === 0 ? (
        <PieChart>
          <text x="50%" y="50%" textAnchor="middle" className="fill-slate-400 text-sm">
            No payment data available
          </text>
        </PieChart>
      ) : (
        <PieChart>
          <defs>
            {TIMELINESS_GRADIENTS.map((grad, i) => (
              <linearGradient key={i} id={`timeGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={grad.from} />
                <stop offset="100%" stopColor={grad.to} />
              </linearGradient>
            ))}
            <filter id="timeShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Glow ring */}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={66}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell
                key={`glow-${index}`}
                fill={TIMELINESS_GRADIENTS[index % TIMELINESS_GRADIENTS.length].from}
                opacity={0.2}
              />
            ))}
          </Pie>
          {/* Main donut */}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            cornerRadius={4}
            filter="url(#timeShadow)"
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
            animationDuration={1200}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#timeGrad-${index % TIMELINESS_GRADIENTS.length})`}
              />
            ))}
          </Pie>
          <text x="50%" y="47%" textAnchor="middle" className="fill-slate-400 text-[10px]" fontWeight={500}>
            TOTAL
          </text>
          <text x="50%" y="56%" textAnchor="middle" className="fill-slate-900 dark:fill-white text-lg" fontWeight={700}>
            {total}
          </text>
          <Tooltip content={<PremiumTooltip />} />
        </PieChart>
      )}
    </ChartWrapper>
  )
}
