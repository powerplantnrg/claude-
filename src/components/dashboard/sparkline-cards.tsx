"use client"

import { AreaChart, Area, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

interface SparklineProps {
  data: { value: number }[]
  color?: string
  height?: number
}

export function Sparkline({ data, color = "#6366f1", height = 48 }: SparklineProps) {
  if (!data || data.length === 0) return null

  const gradientId = `sparkGrad-${color.replace("#", "")}`
  const glowId = `sparkGlow-${color.replace("#", "")}`

  return (
    <div className="mt-3" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="40%" stopColor={color} stopOpacity={0.1} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="2" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
            filter={`url(#${glowId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Gradient Accent Map ──────────────────────────────────────────────
const gradientMap: Record<string, string> = {
  indigo: "from-indigo-500 via-violet-500 to-purple-500",
  rose: "from-rose-500 via-pink-500 to-fuchsia-500",
  emerald: "from-emerald-500 via-teal-500 to-cyan-500",
  amber: "from-amber-500 via-orange-500 to-yellow-500",
  violet: "from-violet-500 via-purple-500 to-indigo-500",
  blue: "from-blue-500 via-indigo-500 to-violet-500",
  cyan: "from-cyan-500 via-teal-500 to-emerald-500",
}

function getGradientClass(color: string): string {
  for (const [key, val] of Object.entries(gradientMap)) {
    if (color.includes(key)) return val
  }
  return "from-slate-400 via-slate-500 to-slate-600"
}

interface SparklineCardProps {
  label: string
  value: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
  sparklineData?: { value: number }[]
  sparklineColor?: string
}

export function SparklineCard({
  label,
  value,
  color,
  bg,
  border,
  icon,
  sparklineData,
  sparklineColor = "#6366f1",
}: SparklineCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-500",
        "hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1",
        "bg-white/80 dark:bg-slate-900/80",
        "border-slate-200/50 dark:border-slate-700/40",
        "backdrop-blur-sm"
      )}
    >
      {/* Premium gradient accent line */}
      <div className={cn(
        "absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r opacity-80 transition-opacity duration-500 group-hover:opacity-100",
        getGradientClass(color)
      )} />

      {/* Subtle background glow on hover */}
      <div className={cn(
        "absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-20",
        color.includes("indigo") && "bg-indigo-500",
        color.includes("rose") && "bg-rose-500",
        color.includes("emerald") && "bg-emerald-500",
        color.includes("amber") && "bg-amber-500",
        color.includes("violet") && "bg-violet-500",
      )} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <p className={cn("mt-2 text-2xl font-bold tabular-nums tracking-tight", color)}>
            {value}
          </p>
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500",
          "group-hover:scale-110 group-hover:shadow-lg",
          bg
        )}>
          {icon}
        </div>
      </div>

      {sparklineData && sparklineData.length > 0 && (
        <Sparkline data={sparklineData} color={sparklineColor} />
      )}
    </div>
  )
}
