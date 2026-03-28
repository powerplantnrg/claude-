"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/* ─── Card Root ─── */

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "glass"
  padding?: "none" | "sm" | "md" | "lg"
}

const variantStyles = {
  default:
    "bg-white dark:bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl shadow-soft",
  elevated:
    "bg-white dark:bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl shadow-glass transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5",
  glass:
    "bg-white/70 dark:bg-white/[0.04] backdrop-blur-[12px] saturate-[1.8] border border-white/30 dark:border-white/[0.08] rounded-xl shadow-soft transition-all duration-200 hover:shadow-glass hover:border-brand-200 dark:hover:border-brand-500/20",
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(variantStyles[variant], paddingStyles[padding], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = "Card"

/* ─── Card Header ─── */

interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, description, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-start justify-between gap-4 mb-4", className)}
        {...props}
      >
        {children ?? (
          <>
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </>
        )}
      </div>
    )
  }
)
CardHeader.displayName = "CardHeader"

/* ─── Card Footer ─── */

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mt-4 pt-4 border-t border-[var(--border-muted)] flex items-center justify-end gap-2",
          className
        )}
        {...props}
      />
    )
  }
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter }
export type { CardProps, CardHeaderProps }
