"use client"

import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  align?: "left" | "center" | "right"
  width?: string
}

interface PaginationConfig {
  defaultPageSize?: number
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pagination?: PaginationConfig
  emptyIcon?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
  striped?: boolean
}

type SortDirection = "asc" | "desc"

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pagination,
  emptyIcon,
  emptyTitle = "No data found",
  emptyDescription = "There are no records to display yet.",
  onRowClick,
  striped = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>("asc")
  const [pageSize, setPageSize] = useState(pagination?.defaultPageSize ?? 10)
  const [currentPage, setCurrentPage] = useState(0)

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal)
      const bStr = String(bVal)
      return sortDir === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })
    return sorted
  }, [data, sortKey, sortDir])

  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = sortedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  )

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setCurrentPage(0)
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setCurrentPage(0)
  }

  const alignClass = (align?: string) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50",
                    alignClass(col.align),
                    col.width
                  )}
                  scope="col"
                  aria-sort={
                    col.sortable && sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : col.sortable
                        ? "none"
                        : undefined
                  }
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        "group inline-flex items-center gap-1.5 transition-colors duration-150",
                        "hover:text-slate-900 dark:hover:text-slate-200",
                        sortKey === col.key && "text-indigo-600 dark:text-indigo-400"
                      )}
                    >
                      {col.label}
                      <span className="flex flex-col">
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5" aria-label="Sorted ascending" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" aria-label="Sorted descending" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors" />
                        )}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    {emptyIcon && (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                        {emptyIcon}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{emptyTitle}</p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{emptyDescription}</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={(row.id as string) ?? idx}
                  className={cn(
                    "group transition-colors duration-150",
                    onRowClick && "cursor-pointer",
                    striped && idx % 2 === 1
                      ? "bg-slate-50/50 dark:bg-slate-800/20"
                      : "bg-white dark:bg-slate-900",
                    "hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-5 py-3.5 text-sm text-slate-700 dark:text-slate-300",
                        alignClass(col.align),
                        col.width
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : (row[col.key] as React.ReactNode) ?? "\u2014"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-150"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              {sortedData.length === 0
                ? "0 rows"
                : `${currentPage * pageSize + 1}\u2013${Math.min(
                    (currentPage + 1) * pageSize,
                    sortedData.length
                  )} of ${sortedData.length}`}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150",
                  "text-slate-500 dark:text-slate-400",
                  "hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200",
                  "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                )}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={currentPage >= totalPages - 1}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150",
                  "text-slate-500 dark:text-slate-400",
                  "hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200",
                  "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                )}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
