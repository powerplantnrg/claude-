import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
        <svg
          className="h-10 w-10 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-lg font-medium text-slate-600">Page not found</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
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
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Back to Dashboard
      </Link>
    </div>
  )
}
