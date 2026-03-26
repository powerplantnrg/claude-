"use client"

import { useState, useTransition } from "react"

type ChecklistItem = {
  id: string
  item: string
  category: string
  completed: boolean
  notes: string | null
}

type CategoryGroup = {
  category: string
  items: ChecklistItem[]
}

const CATEGORY_ICONS: Record<string, string> = {
  Documentation: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  Financial: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  Technical: "M11.42 15.17l-5.11-5.11a1.5 1.5 0 010-2.12l.71-.71a1.5 1.5 0 012.12 0l3.57 3.57 7.17-7.17a1.5 1.5 0 012.12 0l.71.71a1.5 1.5 0 010 2.12L11.42 15.17z",
  Registration: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z",
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Documentation: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Financial: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Technical: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  Registration: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
}

export function ComplianceChecklist({
  projectId,
  categories,
}: {
  projectId: string
  categories: CategoryGroup[]
}) {
  const [items, setItems] = useState<CategoryGroup[]>(categories)
  const [isPending, startTransition] = useTransition()

  async function toggleItem(itemId: string, completed: boolean) {
    // Optimistic update
    setItems((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === itemId ? { ...item, completed } : item
        ),
      }))
    )

    startTransition(async () => {
      try {
        const res = await fetch(`/api/rd/compliance/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        })
        if (!res.ok) {
          // Revert on failure
          setItems((prev) =>
            prev.map((group) => ({
              ...group,
              items: group.items.map((item) =>
                item.id === itemId ? { ...item, completed: !completed } : item
              ),
            }))
          )
        }
      } catch {
        setItems((prev) =>
          prev.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.id === itemId ? { ...item, completed: !completed } : item
            ),
          }))
        )
      }
    })
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((group) => {
        if (group.items.length === 0) return null
        const colors = CATEGORY_COLORS[group.category] || {
          bg: "bg-slate-50",
          text: "text-slate-700",
          border: "border-slate-200",
        }
        const iconPath = CATEGORY_ICONS[group.category]
        const completedCount = group.items.filter((i) => i.completed).length

        return (
          <div key={group.category} className="px-6 py-4">
            <div className="mb-3 flex items-center gap-2">
              {iconPath && (
                <svg
                  className={`h-4 w-4 ${colors.text}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={iconPath}
                  />
                </svg>
              )}
              <h3 className="text-sm font-semibold text-slate-700">
                {group.category}
              </h3>
              <span
                className={`rounded-full ${colors.bg} ${colors.text} px-2 py-0.5 text-xs font-medium`}
              >
                {completedCount}/{group.items.length}
              </span>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(e) => toggleItem(item.id, e.target.checked)}
                    disabled={isPending}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span
                    className={`text-sm ${
                      item.completed
                        ? "text-slate-400 line-through"
                        : "text-slate-700"
                    }`}
                  >
                    {item.item}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
