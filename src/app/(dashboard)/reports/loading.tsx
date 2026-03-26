import { Skeleton } from "@/components/ui/skeleton"

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      {/* Card Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <Skeleton className="mb-4 h-8 w-8 rounded" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-3/4" />
            <Skeleton className="mt-4 h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
