"use client"

import { useEffect, useRef } from "react"

interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    // Focus the cancel-friendly confirm button
    confirmBtnRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmStyles =
    variant === "destructive"
      ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
      : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div
        className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-slate-900"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmStyles}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
