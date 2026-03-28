"use client"

import { forwardRef, type InputHTMLAttributes, useState, useId } from "react"
import { cn } from "@/lib/utils"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  floatingLabel?: boolean
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      floatingLabel = false,
      error,
      hint,
      icon,
      iconRight,
      type = "text",
      placeholder,
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = providedId ?? generatedId
    const [focused, setFocused] = useState(false)
    const [hasValue, setHasValue] = useState(
      Boolean(props.value || props.defaultValue)
    )

    const showFloatingLabel = floatingLabel && label
    const isLabelFloated = focused || hasValue

    return (
      <div className="w-full">
        {label && !floatingLabel && (
          <label
            htmlFor={id}
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500 pointer-events-none [&>svg]:size-full">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            type={type}
            placeholder={showFloatingLabel ? (isLabelFloated ? placeholder : " ") : placeholder}
            className={cn(
              "w-full h-10 px-3 text-sm bg-white dark:bg-white/[0.04] text-slate-900 dark:text-slate-100",
              "border border-[var(--border-default)] rounded-lg",
              "outline-none transition-all duration-150 ease-out",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              "focus:border-brand-500 dark:focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-400/20",
              error && "border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
              icon && "pl-9",
              iconRight && "pr-9",
              showFloatingLabel && "pt-4 pb-1 h-12",
              props.disabled && "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-white/[0.02]",
              className
            )}
            onFocus={(e) => {
              setFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              setHasValue(e.target.value.length > 0)
              props.onBlur?.(e)
            }}
            onChange={(e) => {
              setHasValue(e.target.value.length > 0)
              props.onChange?.(e)
            }}
            {...props}
          />

          {showFloatingLabel && (
            <label
              htmlFor={id}
              className={cn(
                "absolute left-3 transition-all duration-150 ease-out pointer-events-none",
                icon && "left-9",
                isLabelFloated
                  ? "top-1.5 text-[0.625rem] font-medium text-brand-600 dark:text-brand-400"
                  : "top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500"
              )}
            >
              {label}
            </label>
          )}

          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500 pointer-events-none [&>svg]:size-full">
              {iconRight}
            </span>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input }
export type { InputProps }
