import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Documents",
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  Invoice: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Bill: "bg-blue-50 text-blue-700 border-blue-200",
  Expense: "bg-amber-50 text-amber-700 border-amber-200",
  Contact: "bg-violet-50 text-violet-700 border-violet-200",
  Project: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Asset: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Employee: "bg-pink-50 text-pink-700 border-pink-200",
  General: "bg-slate-50 text-slate-700 border-slate-200",
}

const FILE_TYPE_ICONS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/gif": "GIF",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/msword": "DOC",
  "text/csv": "CSV",
  "text/plain": "TXT",
}

function getFileIcon(mimeType: string): string {
  return FILE_TYPE_ICONS[mimeType] ?? "FILE"
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; entityType?: string; view?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  const params = await searchParams
  const search = params.search ?? ""
  const entityTypeFilter = params.entityType ?? ""
  const viewMode = params.view === "list" ? "list" : "grid"

  const where: Record<string, unknown> = { organizationId: orgId }

  if (entityTypeFilter && Object.keys(ENTITY_TYPE_COLORS).includes(entityTypeFilter)) {
    where.entityType = entityTypeFilter
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { fileName: { contains: search } },
      { tags: { contains: search } },
    ]
  }

  const documents = await prisma.document.findMany({
    where,
    include: {
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const entityCounts = await prisma.document.groupBy({
    by: ["entityType"],
    where: { organizationId: orgId },
    _count: true,
  })

  const countMap: Record<string, number> = {}
  entityCounts.forEach((c) => {
    if (c.entityType) countMap[c.entityType] = c._count
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage and organize your files and attachments
          </p>
        </div>
        <Link
          href="/documents/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          Upload Document
        </Link>
      </div>

      {/* Summary Badges */}
      <div className="flex flex-wrap gap-3">
        {Object.keys(ENTITY_TYPE_COLORS).map((type) => {
          const colors = ENTITY_TYPE_COLORS[type]
          const count = countMap[type] ?? 0
          if (count === 0) return null
          return (
            <div
              key={type}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${colors}`}
            >
              {type}
              <span className="font-bold">{count}</span>
            </div>
          )
        })}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          Total
          <span className="font-bold">{documents.length}</span>
        </div>
      </div>

      {/* Search, Filter & View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="flex flex-1 gap-3" method="GET">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by name, filename, or tags..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            name="entityType"
            defaultValue={entityTypeFilter}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            {Object.keys(ENTITY_TYPE_COLORS).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input type="hidden" name="view" value={viewMode} />
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            Filter
          </button>
          {(search || entityTypeFilter) && (
            <Link
              href="/documents"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </form>
        <div className="flex gap-1 rounded-lg border border-slate-300 bg-white p-1">
          <Link
            href={`/documents?${new URLSearchParams({ ...(search ? { search } : {}), ...(entityTypeFilter ? { entityType: entityTypeFilter } : {}), view: "grid" }).toString()}`}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "grid" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            Grid
          </Link>
          <Link
            href={`/documents?${new URLSearchParams({ ...(search ? { search } : {}), ...(entityTypeFilter ? { entityType: entityTypeFilter } : {}), view: "list" }).toString()}`}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "list" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            List
          </Link>
        </div>
      </div>

      {/* Documents Display */}
      {documents.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No documents</h3>
          <p className="mt-1 text-sm text-slate-500">
            {search || entityTypeFilter
              ? "No documents match your filters."
              : "Get started by uploading your first document."}
          </p>
          {!search && !entityTypeFilter && (
            <Link
              href="/documents/upload"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Upload Document
            </Link>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <span className="text-xs font-bold text-slate-600">
                    {getFileIcon(doc.mimeType ?? "")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-slate-900">
                    {doc.name}
                  </h3>
                  <p className="truncate text-xs text-slate-500">{doc.fileName}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ENTITY_TYPE_COLORS[doc.entityType ?? "General"] ?? ENTITY_TYPE_COLORS.General}`}
                >
                  {doc.entityType}
                </span>
                <span className="text-xs text-slate-400">
                  {formatFileSize(doc.fileSize)}
                </span>
              </div>
              {doc.tags && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {doc.tags.split(",").map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-xs text-slate-400">
                  {new Date(doc.createdAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-xs text-slate-400">
                  {doc.uploadedBy?.name ?? doc.uploadedBy?.email ?? "Unknown"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Uploaded By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Tags
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100">
                        <span className="text-xs font-bold text-slate-600">
                          {getFileIcon(doc.mimeType ?? "")}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {doc.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">{doc.fileName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ENTITY_TYPE_COLORS[doc.entityType ?? "General"] ?? ENTITY_TYPE_COLORS.General}`}
                    >
                      {doc.entityType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatFileSize(doc.fileSize)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {doc.uploadedBy?.name ?? doc.uploadedBy?.email ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(doc.createdAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {doc.tags && (
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.split(",").map((tag: string) => (
                          <span
                            key={tag}
                            className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
