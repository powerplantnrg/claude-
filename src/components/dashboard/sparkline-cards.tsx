"use client"

import { AreaChart, Area, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

interface SparklineProps {
  data: { value: number }[]
  color?: string
  height?: number
}

export function Sparkline({ data, color = "#6366f1", height = 40 }: SparklineProps) {
  if (!data || data.length === 0) return null

  return (
    <div className="mt-3" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sparkGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#sparkGrad-${color.replace("#", "")})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
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
        "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5",
        "bg-white dark:bg-slate-900",
        "border-slate-200/80 dark:border-slate-700/50"
      )}
    >
      {/* Gradient accent line at top */}
      <div className={cn(
        "absolute inset-x-0 top-0 h-0.5",
        color.includes("indigo") && "bg-gradient-to-r from-indigo-500 to-violet-500",
        color.includes("rose") && "bg-gradient-to-r from-rose-500 to-pink-500",
        color.includes("emerald") && "bg-gradient-to-r from-emerald-500 to-teal-500",
        color.includes("amber") && "bg-gradient-to-r from-amber-500 to-orange-500",
        color.includes("violet") && "bg-gradient-to-r from-violet-500 to-purple-500",
        !color.includes("indigo") && !color.includes("rose") && !color.includes("emerald") && !color.includes("amber") && !color.includes("violet") && "bg-gradient-to-r from-slate-400 to-slate-500"
      )} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <p className={cn("mt-2 text-2xl font-bold tracking-tight", color)}>
            {value}
          </p>
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
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
