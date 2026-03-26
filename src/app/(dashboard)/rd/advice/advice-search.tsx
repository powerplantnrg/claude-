"use client"

import { useState } from "react"

type AdviceItem = {
  id: string
  title: string
  content: string
  category: string
  priority: number
  applicableWhen: string | null
  organizationId: string | null
}

type CategoryMeta = {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: string
}

function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = className || "h-5 w-5"
  switch (icon) {
    case "Shield":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      )
    case "FileText":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    case "DollarSign":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case "Calendar":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      )
    case "AlertTriangle":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      )
    case "Cpu":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3M21 8.25h-1.5M4.5 12H3M21 12h-1.5M4.5 15.75H3M21 15.75h-1.5M8.25 19.5V21M12 3v1.5M12 19.5V21M15.75 3v1.5M15.75 19.5V21M6.75 6.75h10.5a.75.75 0 01.75.75v9a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75v-9a.75.75 0 01.75-.75z" />
        </svg>
      )
    default:
      return null
  }
}

export function AdviceSearch({
  grouped,
  uncategorized,
  categoryMeta,
}: {
  grouped: Record<string, AdviceItem[]>
  uncategorized: AdviceItem[]
  categoryMeta: Record<string, CategoryMeta>
}) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filterItems = (items: AdviceItem[]) => {
    if (!search) return items
    const lower = search.toLowerCase()
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.content.toLowerCase().includes(lower)
    )
  }

  const categories = Object.keys(categoryMeta)

  return (
    <>
      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search advice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === null
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const meta = categoryMeta[cat]
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white"
                    : `${meta.bgColor} ${meta.color} hover:opacity-80`
                }`}
              >
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Advice Items Grouped by Category */}
      <div className="space-y-8">
        {categories
          .filter((cat) => !selectedCategory || selectedCategory === cat)
          .map((cat) => {
            const meta = categoryMeta[cat]
            const items = filterItems(grouped[cat] || [])
            if (items.length === 0) return null

            return (
              <div key={cat}>
                <div className="mb-4 flex items-center gap-2">
                  <span className={`${meta.color}`}>
                    <CategoryIcon icon={meta.icon} className="h-5 w-5" />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">{meta.label}</h2>
                  <span className={`rounded-full ${meta.bgColor} ${meta.color} px-2 py-0.5 text-xs font-medium`}>
                    {items.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {items.map((item) => {
                    const isExpanded = expandedItems.has(item.id)
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border ${meta.borderColor} bg-white shadow-sm transition-shadow hover:shadow-md`}
                      >
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="flex w-full items-center justify-between px-6 py-4 text-left"
                        >
                          <div className="flex items-center gap-3">
                            {item.priority > 0 && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                                Priority
                              </span>
                            )}
                            <h3 className="text-sm font-medium text-slate-900">
                              {item.title}
                            </h3>
                          </div>
                          <svg
                            className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-slate-100 px-6 py-4">
                            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                              {item.content.split("\n").filter(Boolean).map((para, idx) => (
                                <p key={idx}>{para}</p>
                              ))}
                            </div>
                            {item.applicableWhen && (
                              <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
                                <p className="text-xs font-medium text-slate-500">Applicable when:</p>
                                <p className="mt-1 text-sm text-slate-700">{item.applicableWhen}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

        {/* Uncategorized */}
        {!selectedCategory && filterItems(uncategorized).length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Other Advice</h2>
            <div className="space-y-3">
              {filterItems(uncategorized).map((item) => {
                const isExpanded = expandedItems.has(item.id)
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="flex w-full items-center justify-between px-6 py-4 text-left"
                    >
                      <h3 className="text-sm font-medium text-slate-900">{item.title}</h3>
                      <svg
                        className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-6 py-4">
                        <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                          {item.content.split("\n").filter(Boolean).map((para, idx) => (
                            <p key={idx}>{para}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {Object.values(grouped).every((items) => filterItems(items).length === 0) &&
          filterItems(uncategorized).length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">No advice items found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {search ? "Try adjusting your search terms." : "Advice items will appear here once configured."}
              </p>
            </div>
          )}
      </div>
    </>
  )
}
