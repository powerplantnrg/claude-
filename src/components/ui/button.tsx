"use client"

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 ease-out outline-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-soft hover:from-brand-700 hover:to-brand-600 hover:shadow-glow hover:-translate-y-px active:translate-y-0",
        secondary:
          "bg-white/80 dark:bg-white/5 text-foreground border border-[var(--border-default)] backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/15",
        danger:
          "bg-gradient-to-br from-rose-600 to-rose-500 text-white shadow-soft hover:shadow-glow-rose hover:-translate-y-px active:translate-y-0",
        ghost:
          "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-slate-200",
        outline:
          "border border-[var(--border-default)] text-foreground bg-transparent hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:border-brand-300 dark:hover:border-brand-500/30 hover:text-brand-700 dark:hover:text-brand-300",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[6px]",
        md: "h-9 px-4 text-sm rounded-[8px]",
        lg: "h-11 px-6 text-sm rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      icon,
      iconRight,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="size-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : icon ? (
          <span className="size-4 shrink-0 [&>svg]:size-full">{icon}</span>
        ) : null}
        {children}
        {iconRight && !loading && (
          <span className="size-4 shrink-0 [&>svg]:size-full">{iconRight}</span>
        )}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
export type { ButtonProps }
