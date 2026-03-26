"use client"

import { useEffect } from "react"

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
        <svg
          className="h-7 w-7 text-rose-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-900">
        Something went wrong
      </h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        An unexpected error occurred while loading this page. Please try again
        or contact support if the problem persists.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={() => unstable_retry()}
        className="mt-6 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
      >
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
          />
        </svg>
        Try again
      </button>
    </div>
  )
}
