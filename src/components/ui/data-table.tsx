"use client"

import { useState, useMemo } from "react"

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}

interface PaginationConfig {
  defaultPageSize?: number
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pagination?: PaginationConfig
}

type SortDirection = "asc" | "desc"

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pagination,
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

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-3">
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
                    >
                      {col.label}
                      <span className="text-[10px] leading-none">
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <span aria-label="Sorted ascending">&#9650;</span>
                          ) : (
                            <span aria-label="Sorted descending">&#9660;</span>
                          )
                        ) : (
                          <span className="text-slate-300">&#9650;&#9660;</span>
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
          <tbody className="divide-y divide-slate-50">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-slate-400"
                >
                  No data to display.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={(row.id as string) ?? idx}
                  className="transition-colors hover:bg-slate-50"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-3 text-sm">
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
      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span>
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
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              &laquo; Prev
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={currentPage >= totalPages - 1}
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next &raquo;
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
