"use client"

import { cn } from "@/lib/utils"

// ─── Premium CSS Bar Chart ────────────────────────────────────────────

export function BarChart({
  data,
  maxValue,
  barColor = "bg-indigo-500",
  height = 200,
}: {
  data: { label: string; value: number }[]
  maxValue: number
  barColor?: string
  height?: number
}) {
  const safeMax = maxValue > 0 ? maxValue : 1
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((item, i) => {
        const barHeight = Math.max((Math.abs(item.value) / safeMax) * height * 0.85, 2)
        const isNegative = item.value < 0
        return (
          <div key={i} className="group flex flex-1 flex-col items-center gap-1">
            <div className="relative w-full flex flex-col items-center justify-end" style={{ height: height * 0.85 }}>
              <div
                className={cn(
                  "w-full max-w-[28px] rounded-t-md transition-all duration-500",
                  "group-hover:opacity-90 group-hover:shadow-lg",
                  isNegative ? "bg-gradient-to-t from-rose-600 to-rose-400" : "bg-gradient-to-t from-indigo-600 to-indigo-400",
                )}
                style={{
                  height: barHeight,
                  boxShadow: isNegative
                    ? "0 -2px 8px rgba(244,63,94,0.2)"
                    : "0 -2px 8px rgba(99,102,241,0.2)",
                }}
                title={`${item.label}: $${item.value.toLocaleString()}`}
              />
            </div>
            <span className="text-[9px] font-medium text-slate-400 truncate w-full text-center">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Premium SVG Donut Chart ──────────────────────────────────────────

const DONUT_GRADIENTS = [
  { from: "#6366f1", to: "#8b5cf6" },
  { from: "#10b981", to: "#34d399" },
  { from: "#f59e0b", to: "#fbbf24" },
  { from: "#f43f5e", to: "#fb7185" },
  { from: "#3b82f6", to: "#60a5fa" },
  { from: "#8b5cf6", to: "#a78bfa" },
]

export function DonutChart({
  segments,
  size = 180,
}: {
  segments: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-sm text-slate-400">No data</p>
      </div>
    )
  }

  const radius = 70
  const innerRadius = 50
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 200 200">
        <defs>
          {DONUT_GRADIENTS.map((grad, i) => (
            <linearGradient key={i} id={`donutGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={grad.from} />
              <stop offset="100%" stopColor={grad.to} />
            </linearGradient>
          ))}
          <filter id="donutGlow">
            <feDropShadow dx="0" dy="1" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>
        {segments.map((seg, i) => {
          const pct = seg.value / total
          const dash = circumference * pct
          const gap = circumference - dash
          const currentOffset = offset
          offset += dash
          return (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={`url(#donutGrad-${i % DONUT_GRADIENTS.length})`}
              strokeWidth="24"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
              filter="url(#donutGlow)"
              className="transition-all duration-700"
            />
          )
        })}
        <text x="100" y="92" textAnchor="middle" className="fill-slate-400 text-[10px]" fontWeight={500} fontSize="10">
          TOTAL
        </text>
        <text x="100" y="112" textAnchor="middle" className="fill-slate-900 dark:fill-white" fontWeight={700} fontSize="18">
          ${(total / 1000).toFixed(0)}k
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: `linear-gradient(135deg, ${DONUT_GRADIENTS[i % DONUT_GRADIENTS.length].from}, ${DONUT_GRADIENTS[i % DONUT_GRADIENTS.length].to})`,
                boxShadow: `0 0 6px ${DONUT_GRADIENTS[i % DONUT_GRADIENTS.length].from}40`,
              }}
            />
            <span className="text-slate-500 font-medium">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Premium Trend Line ───────────────────────────────────────────────

export function TrendLine({
  data,
  height = 60,
  color = "#6366f1",
}: {
  data: number[]
  height?: number
  color?: string
}) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 200

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 10) - 5
    return `${x},${y}`
  })

  const areaPoints = [
    `0,${height}`,
    ...points,
    `${width},${height}`,
  ].join(" ")

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`trendFill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="trendLineGlow">
          <feGaussianBlur stdDeviation="2" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon
        fill={`url(#trendFill-${color.replace("#", "")})`}
        points={areaPoints}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
        filter="url(#trendLineGlow)"
      />
    </svg>
  )
}

// ─── Premium KPI Card ─────────────────────────────────────────────────

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
}: {
  title: string
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
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      {(subtitle || trendLabel) && (
        <div className="mt-2 flex items-center gap-2">
          {trendLabel && (
            <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold", trendColor, trendBg)}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendLabel}
            </span>
          )}
          {subtitle && <span className="text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
