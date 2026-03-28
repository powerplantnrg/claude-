"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string | number
  trend?: {
    value: number
    direction: "up" | "down"
  }
  icon?: ReactNode
  sparkline?: ReactNode
  accentColor?: "indigo" | "emerald" | "rose" | "amber" | "blue"
  className?: string
}

const accentStyles = {
  indigo: {
    border: "border-l-brand-500",
    bg: "bg-gradient-to-br from-brand-50/50 to-transparent dark:from-brand-500/[0.06] dark:to-transparent",
    icon: "text-brand-500 dark:text-brand-400",
  },
  emerald: {
    border: "border-l-emerald-500",
    bg: "bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-500/[0.06] dark:to-transparent",
    icon: "text-emerald-500 dark:text-emerald-400",
  },
  rose: {
    border: "border-l-rose-500",
    bg: "bg-gradient-to-br from-rose-50/50 to-transparent dark:from-rose-500/[0.06] dark:to-transparent",
    icon: "text-rose-500 dark:text-rose-400",
  },
  amber: {
    border: "border-l-amber-500",
    bg: "bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-500/[0.06] dark:to-transparent",
    icon: "text-amber-500 dark:text-amber-400",
  },
  blue: {
    border: "border-l-blue-500",
    bg: "bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-500/[0.06] dark:to-transparent",
    icon: "text-blue-500 dark:text-blue-400",
  },
}

export function MetricCard({
  label,
  value,
  trend,
  icon,
  sparkline,
  accentColor = "indigo",
  className,
}: MetricCardProps) {
  const accent = accentStyles[accentColor]

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[var(--border-default)] border-l-[3px]",
        accent.border,
        "bg-white/70 dark:bg-white/[0.03]",
        "backdrop-blur-[12px] saturate-[1.8]",
        "p-5 transition-all duration-200",
        "hover:shadow-glass hover:-translate-y-0.5",
        accent.bg,
        className
      )}
    >
      {/* Header: label + icon */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </span>
        {icon && (
          <span
            className={cn(
              "size-5 shrink-0 [&>svg]:size-full opacity-70",
              accent.icon
            )}
          >
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end gap-3">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-none">
          {value}
        </span>

        {/* Trend */}
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold mb-0.5",
              trend.direction === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            <svg
              className={cn("size-3.5", trend.direction === "down" && "rotate-180")}
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M8 3.5v9M4.5 7L8 3.5 11.5 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>

      {/* Optional sparkline area */}
      {sparkline && (
        <div className="mt-4 h-10 w-full opacity-60">{sparkline}</div>
      )}
    </div>
  )
}

export type { MetricCardProps }
