"use client"

import { AreaChart, Area, ResponsiveContainer } from "recharts"

interface SparklineProps {
  data: { value: number }[]
  color?: string
  height?: number
}

export function Sparkline({ data, color = "#4f46e5", height = 40 }: SparklineProps) {
  if (!data || data.length === 0) return null

  return (
    <div className="mt-2" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sparkGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
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
  sparklineColor = "#4f46e5",
}: SparklineCardProps) {
  return (
    <div
      className={`rounded-xl border ${border} ${bg} dark:bg-slate-800 dark:border-slate-700 p-5 shadow-sm transition-shadow hover:shadow-md`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
      </div>
      <p className={`mt-3 text-xl font-bold ${color}`}>{value}</p>
      {sparklineData && sparklineData.length > 0 && (
        <Sparkline data={sparklineData} color={sparklineColor} />
      )}
    </div>
  )
}
