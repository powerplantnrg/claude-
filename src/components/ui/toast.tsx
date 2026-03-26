"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { subscribe, removeToast, type Toast as ToastItem } from "@/lib/toast-store"

const AUTO_DISMISS_MS = 5000

const typeStyles: Record<string, { bg: string; border: string; icon: string; progress: string }> = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "text-green-500",
    progress: "bg-green-500",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-500",
    progress: "bg-red-500",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "text-amber-500",
    progress: "bg-amber-500",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-500",
    progress: "bg-blue-500",
  },
}

function ToastIcon({ type }: { type: string }) {
  if (type === "success") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  if (type === "error") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
  if (type === "warning") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86l-8.1 14A2 2 0 004.09 21h15.82a2 2 0 001.9-3.14l-8.1-14a2 2 0 00-3.42 0z" />
      </svg>
    )
  }
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SingleToast({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [progress, setProgress] = useState(100)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const startRef = useRef(Date.now())

  const dismiss = useCallback(() => {
    setExiting(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setTimeout(() => removeToast(item.id), 300)
  }, [item.id])

  useEffect(() => {
    // Trigger enter animation
    const frame = requestAnimationFrame(() => setVisible(true))

    startRef.current = Date.now()

    // Progress bar animation
    function tick() {
      const elapsed = Date.now() - startRef.current
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100)
      setProgress(remaining)
      if (remaining > 0) {
        animFrameRef.current = requestAnimationFrame(tick)
      }
    }
    animFrameRef.current = requestAnimationFrame(tick)

    // Auto-dismiss
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS)

    return () => {
      cancelAnimationFrame(frame)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [dismiss])

  const styles = typeStyles[item.type] || typeStyles.info

  return (
    <div
      className={`relative overflow-hidden rounded-lg border shadow-lg transition-all duration-300 ease-in-out ${styles.bg} ${styles.border} ${
        visible && !exiting
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
      }`}
      style={{ minWidth: "320px", maxWidth: "420px" }}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        <span className={`mt-0.5 flex-shrink-0 ${styles.icon}`}>
          <ToastIcon type={item.type} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
          {item.message && (
            <p className="mt-1 text-sm text-slate-600">{item.message}</p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 rounded p-1 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
        <div
          className={`h-full transition-none ${styles.progress}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    return subscribe(setToasts)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-3">
      {toasts.map((t) => (
        <SingleToast key={t.id} item={t} />
      ))}
    </div>
  )
}
