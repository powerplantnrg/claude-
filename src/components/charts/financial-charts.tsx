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
import { useState } from "react"
import { cn } from "@/lib/utils"

// ─── Waterfall Chart ──────────────────────────────────────────────────

interface WaterfallDataItem {
  name: string
  value: number
  isTotal?: boolean
}

export function WaterfallChart({ data, title, subtitle }: { data: WaterfallDataItem[]; title: string; subtitle?: string }) {
  let cumulative = 0
  const waterfallData = data.map((item) => {
    if (item.isTotal) {
      const result = {
        name: item.name,
        value: item.value,
        bottom: 0,
        fill: item.value >= 0 ? CHART_COLORS.indigo : CHART_COLORS.rose,
        gradId: item.value >= 0 ? "wfTotal" : "wfNeg",
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
      gradId: item.value >= 0 ? "wfPos" : "wfNeg",
    }
    cumulative += item.value
    return result
  })

  return (
    <ChartWrapper title={title} subtitle={subtitle} accentColor={CHART_COLORS.indigo}>
      <BarChart data={waterfallData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <defs>
          <linearGradient id="wfPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
          </linearGradient>
          <linearGradient id="wfNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
            <stop offset="100%" stopColor="#e11d48" stopOpacity={0.85} />
          </linearGradient>
          <linearGradient id="wfTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.85} />
          </linearGradient>
          <filter id="wfGlow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.12" />
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
          angle={-25}
          textAnchor="end"
          height={50}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickFormatter={formatCurrencyShort}
          width={55}
        />
        <Tooltip content={<PremiumTooltip formatter={currencyTooltipFormatter} />} />
        <Bar dataKey="bottom" stackId="waterfall" fill="transparent" />
        <Bar dataKey="value" stackId="waterfall" radius={[6, 6, 0, 0]} filter="url(#wfGlow)">
          {waterfallData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={`url(#${entry.gradId})`} />
          ))}
        </Bar>
      </BarChart>
    </ChartWrapper>
  )
}

// ─── Gauge Chart ──────────────────────────────────────────────────────

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
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border p-6 transition-all duration-500",
      "border-slate-200/60 dark:border-slate-700/40",
      "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
      "shadow-sm hover:shadow-lg hover:shadow-indigo-500/5",
      "flex flex-col items-center"
    )}>
      {/* Gradient accent */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}40, ${color}, ${color}40, transparent)` }}
      />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">{label}</h3>
      <div className="relative" style={{ width: 160, height: 100 }}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <defs>
              <linearGradient id={`gaugeGrad-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                <stop offset="100%" stopColor={color} stopOpacity={1} />
              </linearGradient>
              <filter id="gaugeGlow">
                <feGaussianBlur stdDeviation="3" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
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
              cornerRadius={4}
            >
              <Cell fill={`url(#gaugeGrad-${label.replace(/\s/g, "")})`} filter="url(#gaugeGlow)" />
              <Cell fill="#e2e8f020" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {value.toFixed(1)}
            <span className="text-sm font-medium text-slate-400">{unit}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Trend Comparison Chart (dual axis) ───────────────────────────────

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
    <ChartWrapper title={title} subtitle={subtitle} accentColor={metric1Color}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <filter id="trendGlow1">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
        />
        <YAxis
          yAxisId="left"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: metric1Color }}
          tickFormatter={(v) => `${v}${metric1Unit}`}
          width={50}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: metric2Color }}
          tickFormatter={(v) => `${v}${metric2Unit}`}
          width={50}
        />
        <Tooltip content={<PremiumTooltip />} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="metric1"
          name={metric1Name}
          stroke={metric1Color}
          strokeWidth={2.5}
          dot={{ r: 4, fill: metric1Color, stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: metric1Color, stroke: "#fff", strokeWidth: 2 }}
          filter="url(#trendGlow1)"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="metric2"
          name={metric2Name}
          stroke={metric2Color}
          strokeWidth={2.5}
          dot={{ r: 4, fill: metric2Color, stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: metric2Color, stroke: "#fff", strokeWidth: 2 }}
        />
      </LineChart>
    </ChartWrapper>
  )
}

// ─── Breakdown Pie Chart with interactive legend ──────────────────────

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
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border transition-all duration-500",
      "border-slate-200/60 dark:border-slate-700/40",
      "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
      "shadow-sm hover:shadow-lg hover:shadow-indigo-500/5",
    )}>
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #8b5cf640, #8b5cf6, #8b5cf640, transparent)" }}
      />
      <div className="px-6 pt-5 pb-1">
        <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="px-4 pb-4 pt-2">
        {data.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            No data available
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <defs>
                    {GRADIENT_PAIRS.map((pair, i) => (
                      <linearGradient key={i} id={`brkGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={pair.from} />
                        <stop offset="100%" stopColor={pair.to} />
                      </linearGradient>
                    ))}
                    <filter id="pieHoverShadow">
                      <feDropShadow dx="0" dy="2" stdDeviation="6" floodOpacity="0.25" />
                    </filter>
                  </defs>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={activeIndex !== null ? 105 : 100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={3}
                    onClick={(_, index) => setActiveIndex(activeIndex === index ? null : index)}
                    animationDuration={800}
                  >
                    {data.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#brkGrad-${index % GRADIENT_PAIRS.length})`}
                        opacity={activeIndex !== null && activeIndex !== index ? 0.35 : 1}
                        filter={activeIndex === index ? "url(#pieHoverShadow)" : undefined}
                      />
                    ))}
                  </Pie>
                  <text x="50%" y="47%" textAnchor="middle" className="fill-slate-400 text-[10px]" fontWeight={500}>
                    TOTAL
                  </text>
                  <text x="50%" y="56%" textAnchor="middle" className="fill-slate-900 dark:fill-white text-sm" fontWeight={700}>
                    {currencyTooltipFormatter(total)}
                  </text>
                  <Tooltip content={<PremiumTooltip formatter={currencyTooltipFormatter} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full lg:w-1/2 space-y-1">
              {data.map((item, index) => {
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0"
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-all duration-200",
                      activeIndex === index
                        ? "bg-slate-100/80 dark:bg-slate-700/50 shadow-sm"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full transition-transform duration-200"
                        style={{
                          background: `linear-gradient(135deg, ${GRADIENT_PAIRS[index % GRADIENT_PAIRS.length].from}, ${GRADIENT_PAIRS[index % GRADIENT_PAIRS.length].to})`,
                          boxShadow: activeIndex === index ? `0 0 8px ${CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]}60` : "none",
                          transform: activeIndex === index ? "scale(1.3)" : "scale(1)",
                        }}
                      />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {currencyTooltipFormatter(item.value)}
                      </span>
                      <span className="ml-1.5 text-[10px] tabular-nums text-slate-400">({pct}%)</span>
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

// ─── Line Trend Chart ─────────────────────────────────────────────────

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
  const gradId = `lineTrend-${color.replace("#", "")}`

  return (
    <ChartWrapper title={title} subtitle={subtitle} accentColor={color}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <filter id="lineGlowTrend">
            <feGaussianBlur stdDeviation="2.5" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickFormatter={yAxisFormatter || formatCurrencyShort}
          width={55}
        />
        <Tooltip content={<PremiumTooltip formatter={tooltipFormatter || currencyTooltipFormatter} />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: color, stroke: "#fff", strokeWidth: 2.5 }}
          filter="url(#lineGlowTrend)"
        />
      </LineChart>
    </ChartWrapper>
  )
}

// ─── Stacked Bar Chart ────────────────────────────────────────────────

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
    <ChartWrapper title={title} subtitle={subtitle} accentColor={barColors[0]}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {barColors.map((c, i) => (
            <linearGradient key={i} id={`stackGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={1} />
              <stop offset="100%" stopColor={c} stopOpacity={0.75} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickFormatter={yAxisFormatter || formatCurrencyShort}
          width={55}
        />
        <Tooltip content={<PremiumTooltip formatter={currencyTooltipFormatter} />} />
        {keys.map((key, i) => (
          <Bar
            key={key.dataKey}
            dataKey={key.dataKey}
            name={key.name}
            stackId="stack"
            fill={`url(#stackGrad-${i % barColors.length})`}
            radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartWrapper>
  )
}

// ─── Multi-Line Chart ─────────────────────────────────────────────────

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
    <ChartWrapper title={title} subtitle={subtitle} accentColor={lines[0]?.color}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {lines.map((line, i) => (
            <linearGradient key={`mlGrad-${i}`} id={`mlGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line.color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={line.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickFormatter={yAxisFormatter || formatCurrencyShort}
          width={55}
        />
        <Tooltip content={<PremiumTooltip formatter={currencyTooltipFormatter} />} />
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={2.5}
            strokeDasharray={line.strokeDasharray}
            dot={{ r: 3.5, fill: line.color, stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: line.color, stroke: "#fff", strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ChartWrapper>
  )
}

// ─── Metric Card ──────────────────────────────────────────────────────

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
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-slate-400"
  const trendBg = trend === "up" ? "bg-emerald-50 dark:bg-emerald-500/10" : trend === "down" ? "bg-rose-50 dark:bg-rose-500/10" : "bg-slate-50 dark:bg-slate-500/10"

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-500",
      "border-slate-200/60 dark:border-slate-700/40",
      "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
      "shadow-sm hover:shadow-lg hover:shadow-indigo-500/5",
    )}>
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #6366f130, #6366f1, #6366f130, transparent)" }}
      />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      {(subtitle || trendLabel) && (
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold", trendColor, trendBg)}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
              {trendLabel && <span className="ml-0.5">{trendLabel}</span>}
            </span>
          )}
          {subtitle && <span className="text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
