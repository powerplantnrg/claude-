"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
    >
      Print
    </button>
  )
}
