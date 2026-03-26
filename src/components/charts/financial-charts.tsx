"use client"

import {
  BarChart,
  Bar,
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
  ReferenceLine,
} from "recharts"
import { CHART_COLORS, CHART_COLOR_ARRAY } from "./chart-wrapper"
import { useState } from "react"

function formatCurrencyShort(value: number) {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function currencyTooltipFormatter(value: any) {
  const num = Number(value ?? 0)
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function percentTooltipFormatter(value: any) {
  const num = Number(value ?? 0)
  return `${num.toFixed(1)}%`
}

// --- Waterfall Chart ---

interface WaterfallDataItem {
  name: string
  value: number
  isTotal?: boolean
}

export function WaterfallChart({ data, title, subtitle }: { data: WaterfallDataItem[]; title: string; subtitle?: string }) {
  // Build waterfall: each bar shows cumulative positioning
  let cumulative = 0
  const waterfallData = data.map((item) => {
    if (item.isTotal) {
      const result = {
        name: item.name,
        value: item.value,
        bottom: 0,
        fill: item.value >= 0 ? CHART_COLORS.indigo : CHART_COLORS.rose,
      }
      cumulative = item.value
      return result
    }
    const bottom = item.value >= 0 ? cumulative : cumulative + item.value
    const result = {
      name: item.name,
      value: Math.abs(item.value),
      bottom: Math.max(bottom, 0),
      fill: item.value >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose,
    }
    cumulative += item.value
    return result
  })

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={waterfallData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={formatCurrencyShort} />
            <Tooltip formatter={currencyTooltipFormatter} />
            <Bar dataKey="bottom" stackId="waterfall" fill="transparent" />
            <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// --- Gauge Chart ---

interface GaugeChartProps {
  value: number
  max: number
  label: string
  unit?: string
  color?: string
}

export function GaugeChart({ value, max, label, unit = "%", color = CHART_COLORS.indigo }: GaugeChartProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const gaugeData = [
    { name: "value", value: percentage },
    { name: "remaining", value: 100 - percentage },
  ]

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6 flex flex-col items-center">
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{label}</h3>
      <div className="relative" style={{ width: 160, height: 100 }}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={55}
              outerRadius={75}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#e2e8f0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {value.toFixed(1)}{unit}
          </span>
        </div>
      </div>
    </div>
  )
}

// --- Trend Comparison Chart (dual axis) ---

interface TrendComparisonDataItem {
  label: string
  metric1: number
  metric2: number
}

interface TrendComparisonChartProps {
  data: TrendComparisonDataItem[]
  title: string
  subtitle?: string
  metric1Name: string
  metric2Name: string
  metric1Color?: string
  metric2Color?: string
  metric1Unit?: string
  metric2Unit?: string
}

export function TrendComparisonChart({
  data,
  title,
  subtitle,
  metric1Name,
  metric2Name,
  metric1Color = CHART_COLORS.indigo,
  metric2Color = CHART_COLORS.emerald,
  metric1Unit = "",
  metric2Unit = "",
}: TrendComparisonChartProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: metric1Color }}
              tickFormatter={(v) => `${v}${metric1Unit}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: metric2Color }}
              tickFormatter={(v) => `${v}${metric2Unit}`}
            />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="metric1" name={metric1Name} stroke={metric1Color} strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="metric2" name={metric2Name} stroke={metric2Color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// --- Breakdown Pie Chart with legend and click-to-drill ---

interface BreakdownPieDataItem {
  name: string
  value: number
}

interface BreakdownPieChartProps {
  data: BreakdownPieDataItem[]
  title: string
  subtitle?: string
}

export function BreakdownPieChart({ data, title, subtitle }: BreakdownPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="p-6">
        {data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            No data available
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(_, index) => setActiveIndex(activeIndex === index ? null : index)}
                  >
                    {data.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]}
                        opacity={activeIndex !== null && activeIndex !== index ? 0.4 : 1}
                        stroke={activeIndex === index ? "#1e293b" : "none"}
                        strokeWidth={activeIndex === index ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={currencyTooltipFormatter} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full lg:w-1/2 space-y-2">
              {data.map((item, index) => {
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0"
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      activeIndex === index
                        ? "bg-slate-100 dark:bg-slate-700"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length] }}
                      />
                      <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {currencyTooltipFormatter(item.value)}
                      </span>
                      <span className="ml-2 text-slate-400">({pct}%)</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Simple Line Trend Chart ---

interface LineTrendDataItem {
  label: string
  value: number
}

export function LineTrendChart({
  data,
  title,
  subtitle,
  color = CHART_COLORS.indigo,
  yAxisFormatter,
  tooltipFormatter,
}: {
  data: LineTrendDataItem[]
  title: string
  subtitle?: string
  color?: string
  yAxisFormatter?: (value: number) => string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: any
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={yAxisFormatter || formatCurrencyShort} />
            <Tooltip formatter={tooltipFormatter || currencyTooltipFormatter} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// --- Stacked Bar Chart ---

interface StackedBarDataItem {
  label: string
  [key: string]: string | number
}

export function StackedBarChart({
  data,
  title,
  subtitle,
  keys,
  colors,
  yAxisFormatter,
}: {
  data: StackedBarDataItem[]
  title: string
  subtitle?: string
  keys: { dataKey: string; name: string }[]
  colors?: string[]
  yAxisFormatter?: (value: number) => string
}) {
  const barColors = colors || CHART_COLOR_ARRAY

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={yAxisFormatter || formatCurrencyShort} />
            <Tooltip formatter={currencyTooltipFormatter} />
            <Legend />
            {keys.map((key, i) => (
              <Bar
                key={key.dataKey}
                dataKey={key.dataKey}
                name={key.name}
                stackId="stack"
                fill={barColors[i % barColors.length]}
                radius={i === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// --- Multi-Line Chart ---

interface MultiLineDataItem {
  label: string
  [key: string]: string | number
}

export function MultiLineChart({
  data,
  title,
  subtitle,
  lines,
  yAxisFormatter,
}: {
  data: MultiLineDataItem[]
  title: string
  subtitle?: string
  lines: { dataKey: string; name: string; color: string; strokeDasharray?: string }[]
  yAxisFormatter?: (value: number) => string
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={yAxisFormatter || formatCurrencyShort} />
            <Tooltip formatter={currencyTooltipFormatter} />
            <Legend />
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                strokeDasharray={line.strokeDasharray}
                dot={{ r: 3, fill: line.color }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// --- KPI Metric Card ---

export function MetricCard({
  label,
  value,
  subtitle,
  trend,
  trendLabel,
}: {
  label: string
  value: string
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {(subtitle || trendLabel) && (
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span className={`text-xs font-medium ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-slate-500"}`}>
              {trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : "\u2192"}
            </span>
          )}
          {trendLabel && <span className="text-xs text-slate-500 dark:text-slate-400">{trendLabel}</span>}
          {subtitle && <span className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
