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
  ResponsiveContainer,
} from "recharts"
import {
  ChartWrapper,
  PremiumTooltip,
  PremiumLegend,
  CHART_COLORS,
  CHART_COLOR_ARRAY,
  GRADIENT_PAIRS,
  formatCurrencyShort,
  currencyTooltipFormatter,
} from "./chart-wrapper"

// ─── Revenue vs Expenses ──────────────────────────────────────────────

interface RevenueExpenseData {
  month: string
  revenue: number
  expenses: number
}

export function RevenueExpensesChart({ data }: { data: RevenueExpenseData[] }) {
  return (
    <ChartWrapper
      title="Revenue vs Expenses"
      subtitle="Last 6 months performance"
      accentColor={CHART_COLORS.indigo}
    >
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#e11d48" stopOpacity={0.7} />
          </linearGradient>
          <filter id="barGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e2e8f020"
          vertical={false}
        />
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
        <Tooltip
          content={<PremiumTooltip formatter={currencyTooltipFormatter} />}
          cursor={{ fill: "#6366f108", radius: 8 }}
        />
        <Bar
          dataKey="revenue"
          name="Revenue"
          fill="url(#revenueGrad)"
          radius={[6, 6, 2, 2]}
          maxBarSize={32}
        />
        <Bar
          dataKey="expenses"
          name="Expenses"
          fill="url(#expenseGrad)"
          radius={[6, 6, 2, 2]}
          maxBarSize={32}
        />
      </BarChart>
    </ChartWrapper>
  )
}

// ─── Cash Flow Area Chart ─────────────────────────────────────────────

interface CashFlowData {
  month: string
  inflow: number
  outflow: number
  net: number
}

export function CashFlowChart({ data }: { data: CashFlowData[] }) {
  return (
    <ChartWrapper
      title="Cash Flow"
      subtitle="Monthly inflow, outflow & net position"
      accentColor={CHART_COLORS.emerald}
    >
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="50%" stopColor="#10b981" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
            <stop offset="50%" stopColor="#f43f5e" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e2e8f020"
          vertical={false}
        />
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
        <Tooltip
          content={<PremiumTooltip formatter={currencyTooltipFormatter} />}
        />
        <Area
          type="monotone"
          dataKey="inflow"
          name="Inflow"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#inflowGrad)"
          dot={false}
          activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="outflow"
          name="Outflow"
          stroke="#f43f5e"
          strokeWidth={2}
          fill="url(#outflowGrad)"
          dot={false}
          activeDot={{ r: 5, fill: "#f43f5e", stroke: "#fff", strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="net"
          name="Net"
          stroke="#6366f1"
          strokeWidth={2}
          strokeDasharray="6 4"
          fill="url(#netGrad)"
          dot={false}
          activeDot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
          filter="url(#lineGlow)"
        />
      </AreaChart>
    </ChartWrapper>
  )
}

// ─── R&D Spend by Category — Premium Donut ────────────────────────────

interface RdCategoryData {
  name: string
  value: number
}

export function RdSpendByCategoryChart({ data }: { data: RdCategoryData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ChartWrapper title="R&D Spend by Category" accentColor={CHART_COLORS.violet}>
      <PieChart>
        <defs>
          {GRADIENT_PAIRS.map((pair, i) => (
            <linearGradient key={i} id={`pieGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={pair.from} />
              <stop offset="100%" stopColor={pair.to} />
            </linearGradient>
          ))}
          <filter id="donutShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
          </filter>
        </defs>
        {data.length === 0 ? null : (
          <>
            {/* Outer glow ring */}
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={76}
              dataKey="value"
              stroke="none"
              isAnimationActive={true}
            >
              {data.map((_, index) => (
                <Cell
                  key={`glow-${index}`}
                  fill={CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]}
                  opacity={0.2}
                />
              ))}
            </Pie>
            {/* Main donut */}
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
              filter="url(#donutShadow)"
              animationBegin={0}
              animationDuration={1200}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#pieGrad-${index % GRADIENT_PAIRS.length})`}
                />
              ))}
            </Pie>
            {/* Center label */}
            <text x="50%" y="46%" textAnchor="middle" className="fill-slate-400 text-[10px]" fontWeight={500}>
              TOTAL
            </text>
            <text x="50%" y="56%" textAnchor="middle" className="fill-slate-900 dark:fill-slate-100 text-base" fontWeight={700}>
              {currencyTooltipFormatter(total)}
            </text>
          </>
        )}
        <Tooltip
          content={<PremiumTooltip formatter={currencyTooltipFormatter} />}
        />
      </PieChart>
    </ChartWrapper>
  )
}
