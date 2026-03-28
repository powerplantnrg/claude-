"use client"

import { ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

// ─── Premium Color System ─────────────────────────────────────────────
export const CHART_COLORS = {
  indigo: "#6366f1",
  blue: "#3b82f6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  slate: "#64748b",
  pink: "#ec4899",
  teal: "#14b8a6",
} as const

export const CHART_COLOR_ARRAY = [
  CHART_COLORS.indigo,
  CHART_COLORS.violet,
  CHART_COLORS.blue,
  CHART_COLORS.emerald,
  CHART_COLORS.cyan,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.pink,
  CHART_COLORS.teal,
  CHART_COLORS.slate,
]

// Gradient pairs for premium fills
export const GRADIENT_PAIRS = [
  { from: "#6366f1", to: "#8b5cf6" },  // indigo → violet
  { from: "#8b5cf6", to: "#a78bfa" },  // violet → light violet
  { from: "#3b82f6", to: "#60a5fa" },  // blue → light blue
  { from: "#10b981", to: "#34d399" },  // emerald → light emerald
  { from: "#06b6d4", to: "#22d3ee" },  // cyan → light cyan
  { from: "#f59e0b", to: "#fbbf24" },  // amber → light amber
  { from: "#f43f5e", to: "#fb7185" },  // rose → light rose
  { from: "#ec4899", to: "#f472b6" },  // pink → light pink
]

// ─── Formatters ───────────────────────────────────────────────────────
export function formatCurrencyShort(value: number) {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function currencyTooltipFormatter(value: any) {
  const num = Number(value ?? 0)
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function percentTooltipFormatter(value: any) {
  const num = Number(value ?? 0)
  return `${num.toFixed(1)}%`
}

// ─── Premium Custom Tooltip ───────────────────────────────────────────
interface TooltipPayloadItem {
  name: string
  value: number
  color: string
  dataKey: string
}

interface PremiumTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatter?: (value: any) => string
}

export function PremiumTooltip({ active, payload, label, formatter = currencyTooltipFormatter }: PremiumTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="animate-in fade-in-0 zoom-in-95 duration-200">
      <div className="rounded-xl border border-white/20 bg-slate-900/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
        {label && (
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            {label}
          </p>
        )}
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full shadow-sm"
                  style={{
                    backgroundColor: entry.color,
                    boxShadow: `0 0 6px ${entry.color}60`,
                  }}
                />
                <span className="text-xs text-slate-300">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-white">
                {formatter(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Premium Chart Card Wrapper ───────────────────────────────────────
interface ChartWrapperProps {
  title: string
  subtitle?: string
  height?: number
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
  accentColor?: string
}

export function ChartWrapper({
  title,
  subtitle,
  height = 340,
  children,
  action,
  className,
  accentColor,
}: ChartWrapperProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-500",
        "border-slate-200/60 dark:border-slate-700/40",
        "bg-white/80 dark:bg-slate-900/80",
        "backdrop-blur-sm",
        "shadow-sm hover:shadow-lg hover:shadow-indigo-500/5",
        "hover:border-slate-300/80 dark:hover:border-slate-600/60",
        className
      )}
    >
      {/* Gradient accent line at top */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: accentColor
            ? `linear-gradient(90deg, transparent, ${accentColor}40, ${accentColor}, ${accentColor}40, transparent)`
            : "linear-gradient(90deg, transparent, #6366f130, #6366f1, #8b5cf6, #6366f130, transparent)",
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-1">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>

      {/* Chart area */}
      <div className="px-4 pb-4 pt-2">
        <ResponsiveContainer width="100%" height={height}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Premium Legend ───────────────────────────────────────────────────
interface LegendItem {
  name: string
  color: string
  value?: string
}

export function PremiumLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-6 pb-4">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: item.color,
              boxShadow: `0 0 6px ${item.color}50`,
            }}
          />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {item.name}
          </span>
          {item.value && (
            <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
              {item.value}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
