"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  Receipt,
  Users,
  BookOpen,
  FlaskConical,
  CreditCard,
  BarChart3,
  Upload,
  Lightbulb,
  Terminal,
  Wallet,
  Search,
  Command,
  DollarSign,
  UserPlus,
  FolderKanban,
  Clock,
  Landmark,
  Database,
  ShoppingCart,
  ClipboardList,
} from "lucide-react"

type QuickAction = {
  label: string
  href: string
  icon: React.ReactNode
  category: string
}

const actions: QuickAction[] = [
  { label: "New Invoice", href: "/invoices/new", icon: <FileText className="h-4 w-4" />, category: "Create" },
  { label: "New Bill", href: "/bills/new", icon: <Receipt className="h-4 w-4" />, category: "Create" },
  { label: "New Contact", href: "/contacts/new", icon: <Users className="h-4 w-4" />, category: "Create" },
  { label: "New Journal Entry", href: "/journal-entries/new", icon: <BookOpen className="h-4 w-4" />, category: "Create" },
  { label: "New R&D Project", href: "/rd/projects/new", icon: <FlaskConical className="h-4 w-4" />, category: "Create" },
  { label: "New Expense Claim", href: "/expenses/new", icon: <Wallet className="h-4 w-4" />, category: "Create" },
  { label: "Record Payment", href: "/payments", icon: <CreditCard className="h-4 w-4" />, category: "Actions" },
  { label: "View Reports", href: "/reports", icon: <BarChart3 className="h-4 w-4" />, category: "Navigate" },
  { label: "Import Bank Transactions", href: "/banking/import", icon: <Upload className="h-4 w-4" />, category: "Actions" },
  { label: "R&D Recommendations", href: "/rd/recommendations", icon: <Lightbulb className="h-4 w-4" />, category: "Navigate" },
  { label: "Command Center", href: "/command-center", icon: <Terminal className="h-4 w-4" />, category: "Navigate" },
  { label: "Run Payroll", href: "/payroll/pay-runs/new", icon: <DollarSign className="h-4 w-4" />, category: "Actions" },
  { label: "Add Employee", href: "/payroll/employees/new", icon: <UserPlus className="h-4 w-4" />, category: "Create" },
  { label: "New Project", href: "/projects/new", icon: <FolderKanban className="h-4 w-4" />, category: "Create" },
  { label: "Log Time", href: "/time-tracking", icon: <Clock className="h-4 w-4" />, category: "Actions" },
  { label: "New Asset", href: "/assets/new", icon: <Landmark className="h-4 w-4" />, category: "Create" },
  { label: "Start Migration", href: "/migration/new", icon: <Database className="h-4 w-4" />, category: "Actions" },
  { label: "Post to Marketplace", href: "/marketplace/requirements/new", icon: <ShoppingCart className="h-4 w-4" />, category: "Create" },
  { label: "Stock Take", href: "/inventory/stock-takes", icon: <ClipboardList className="h-4 w-4" />, category: "Actions" },
]

export function QuickActions() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const filtered = useMemo(() => {
    if (!query) return actions
    const q = query.toLowerCase()
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    )
  }, [query])

  const openPalette = useCallback(() => {
    setOpen(true)
    setQuery("")
    setSelectedIndex(0)
  }, [])

  const closePalette = useCallback(() => {
    setOpen(false)
    setQuery("")
    setSelectedIndex(0)
  }, [])

  // Expose openPalette on window for keyboard shortcuts component
  useEffect(() => {
    (window as any).__openCommandPalette = openPalette
    return () => {
      delete (window as any).__openCommandPalette
    }
  }, [openPalette])

  // Cmd+K / Ctrl+K handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        if (open) {
          closePalette()
        } else {
          openPalette()
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, openPalette, closePalette])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll("[data-action-item]")
    items[selectedIndex]?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault()
      router.push(filtered[selectedIndex].href)
      closePalette()
    } else if (e.key === "Escape") {
      e.preventDefault()
      closePalette()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closePalette}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-700">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            className="flex-1 border-0 bg-transparent py-3 text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-slate-100"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">
              No results found
            </p>
          ) : (
            filtered.map((action, idx) => (
              <button
                key={action.href}
                data-action-item
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  idx === selectedIndex
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"
                }`}
                onClick={() => {
                  router.push(action.href)
                  closePalette()
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700">
                  {action.icon}
                </span>
                <span className="flex-1 font-medium">{action.label}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {action.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-slate-200 px-4 py-2.5 text-[11px] text-slate-400 dark:border-slate-700">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 dark:border-slate-600 dark:bg-slate-700">
              &uarr;&darr;
            </kbd>{" "}
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 dark:border-slate-600 dark:bg-slate-700">
              &crarr;
            </kbd>{" "}
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 dark:border-slate-600 dark:bg-slate-700">
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  )
}
