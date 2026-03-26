"use client"

import { ResponsiveContainer } from "recharts"

interface ChartWrapperProps {
  title: string
  subtitle?: string
  height?: number
  children: React.ReactNode
}

export function ChartWrapper({
  title,
  subtitle,
  height = 320,
  children,
}: ChartWrapperProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={height}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export const CHART_COLORS = {
  indigo: "#4f46e5",
  blue: "#3b82f6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  slate: "#64748b",
} as const

export const CHART_COLOR_ARRAY = [
  CHART_COLORS.indigo,
  CHART_COLORS.blue,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.violet,
  CHART_COLORS.cyan,
  CHART_COLORS.slate,
]
