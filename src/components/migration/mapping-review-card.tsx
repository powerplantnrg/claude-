"use client"

import { cn } from "@/lib/utils"
import { ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react"

interface FieldDiff {
  field: string
  sourceValue: string
  targetValue: string
  isDifferent: boolean
}

interface MappingReviewCardProps {
  sourceId: string
  sourceName: string
  targetName?: string
  entityType: string
  status: "mapped" | "unmapped" | "review" | "skipped"
  diffs?: FieldDiff[]
  expanded?: boolean
  onToggle?: () => void
  className?: string
}

export function MappingReviewCard({
  sourceId,
  sourceName,
  targetName,
  entityType,
  status,
  diffs = [],
  expanded = false,
  onToggle,
  className,
}: MappingReviewCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md",
        status === "mapped" && "border-green-200",
        status === "unmapped" && "border-amber-200",
        status === "review" && "border-blue-200",
        status === "skipped" && "border-slate-200 opacity-60",
        className
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
              status === "mapped" && "bg-green-100 text-green-700",
              status === "unmapped" && "bg-amber-100 text-amber-700",
              status === "review" && "bg-blue-100 text-blue-700",
              status === "skipped" && "bg-slate-100 text-slate-500"
            )}
          >
            {status === "mapped" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : status === "review" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              entityType.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{sourceName}</p>
            <p className="text-xs text-slate-500">ID: {sourceId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {targetName && (
            <>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{targetName}</span>
            </>
          )}
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              status === "mapped" && "bg-green-100 text-green-700",
              status === "unmapped" && "bg-amber-100 text-amber-700",
              status === "review" && "bg-blue-100 text-blue-700",
              status === "skipped" && "bg-slate-100 text-slate-500"
            )}
          >
            {status === "mapped" ? "Mapped" : status === "unmapped" ? "Unmapped" : status === "review" ? "Needs Review" : "Skipped"}
          </span>
        </div>
      </button>

      {expanded && diffs.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Field</span>
            <span>Source</span>
            <span>Target</span>
          </div>
          {diffs.map((diff) => (
            <div
              key={diff.field}
              className={cn(
                "grid grid-cols-3 gap-2 rounded-lg px-2 py-1.5 text-sm",
                diff.isDifferent ? "bg-amber-50" : "bg-slate-50"
              )}
            >
              <span className="font-medium text-slate-700">{diff.field}</span>
              <span className={cn(diff.isDifferent ? "text-red-600 font-medium" : "text-slate-600")}>
                {diff.sourceValue || "-"}
              </span>
              <span className={cn(diff.isDifferent ? "text-green-600 font-medium" : "text-slate-600")}>
                {diff.targetValue || "-"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
