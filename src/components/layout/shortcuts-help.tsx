"use client"

import { X } from "lucide-react"

type ShortcutGroup = {
  title: string
  shortcuts: { keys: string[]; description: string }[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Open command palette" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "I"], description: "Go to Invoices" },
      { keys: ["G", "B"], description: "Go to Bills" },
      { keys: ["G", "R"], description: "Go to Reports" },
      { keys: ["G", "P"], description: "Go to R&D Projects" },
    ],
  },
]

interface ShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && (
                            <span className="mx-0.5 text-xs text-slate-400">
                              +
                            </span>
                          )}
                          <kbd className="inline-flex min-w-[24px] items-center justify-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          On macOS, use <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 text-[10px] dark:border-slate-600 dark:bg-slate-700">Cmd</kbd> instead of <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 text-[10px] dark:border-slate-600 dark:bg-slate-700">Ctrl</kbd>
        </p>
      </div>
    </div>
  )
}
