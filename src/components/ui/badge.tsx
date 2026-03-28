"use client"

import { cn } from "@/lib/utils"

const variantStyles = {
  success:
    "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/15 hover:shadow-[0_0_12px_rgba(16,185,129,0.12)]",
  warning:
    "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/15 hover:shadow-[0_0_12px_rgba(245,158,11,0.12)]",
  danger:
    "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/15 hover:shadow-[0_0_12px_rgba(244,63,94,0.12)]",
  info: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/15 hover:shadow-[0_0_12px_rgba(59,130,246,0.12)]",
  neutral:
    "bg-slate-100 text-slate-600 border-slate-200/60 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/15",
  purple:
    "bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/15 hover:shadow-[0_0_12px_rgba(139,92,246,0.12)]",
}

const dotColors = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-blue-500",
  neutral: "bg-slate-400",
  purple: "bg-violet-500",
}

const sizeStyles = {
  sm: "px-2 py-0.5 text-[0.6875rem]",
  md: "px-2.5 py-1 text-xs",
}

interface BadgeProps {
  variant: "success" | "warning" | "danger" | "info" | "neutral" | "purple"
  children: React.ReactNode
  dot?: boolean
  size?: "sm" | "md"
  className?: string
}

export function Badge({
  variant,
  children,
  dot = false,
  size = "md",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border backdrop-blur-[2px] transition-shadow duration-200",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  )
}
