"use client"

import { useState, useRef, useEffect, useCallback, useId } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

interface SearchResults {
  contacts: { id: string; name: string; email: string | null; contactType: string }[]
  invoices: { id: string; invoiceNumber: string; total: number; status: string }[]
  bills: { id: string; billNumber: string; total: number; status: string }[]
  projects: { id: string; name: string; status: string }[]
  experiments: { id: string; name: string; status: string }[]
  accounts: { id: string; name: string; code: string; type: string }[]
  rdActivities: { id: string; name: string; status: string; rdProjectId: string }[]
  employees: { id: string; firstName: string; lastName: string; email: string; status: string }[]
  fixedAssets: { id: string; name: string; assetNumber: string; status: string }[]
  inventoryItems: { id: string; name: string; sku: string | null; quantityOnHand: number }[]
  costingProjects: { id: string; name: string; code: string | null; status: string }[]
  documents: { id: string; name: string; type: string }[]
  marketplaceProviders: { id: string; companyName: string; status: string }[]
  marketplaceListings: { id: string; title: string; status: string }[]
  marketplaceContracts: { id: string; title: string; status: string }[]
  migrationJobs: { id: string; name: string; status: string; sourceSystem: string }[]
}

const CATEGORY_LABELS: Record<keyof SearchResults, string> = {
  contacts: "Contacts",
  invoices: "Invoices",
  bills: "Bills",
  projects: "R&D Projects",
  experiments: "Experiments",
  accounts: "Accounts",
  rdActivities: "R&D Activities",
  employees: "Employees",
  fixedAssets: "Fixed Assets",
  inventoryItems: "Inventory Items",
  costingProjects: "Projects",
  documents: "Documents",
  marketplaceProviders: "Marketplace Providers",
  marketplaceListings: "Marketplace Listings",
  marketplaceContracts: "Marketplace Contracts",
  migrationJobs: "Migration Jobs",
}

const CATEGORY_PATHS: Record<keyof SearchResults, string> = {
  contacts: "/contacts",
  invoices: "/invoices",
  bills: "/bills",
  projects: "/rd/projects",
  experiments: "/rd/experiments",
  accounts: "/accounts",
  rdActivities: "/rd/activities",
  employees: "/payroll/employees",
  fixedAssets: "/assets",
  inventoryItems: "/inventory/items",
  costingProjects: "/projects",
  documents: "/documents",
  marketplaceProviders: "/marketplace/providers",
  marketplaceListings: "/marketplace/listings",
  marketplaceContracts: "/marketplace/contracts",
  migrationJobs: "/migration/jobs",
}

export function GlobalSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const router = useRouter()
  const listboxId = useId()

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null)
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
        setIsOpen(true)
      }
    } catch {
      // ignore fetch errors silently
    } finally {
      setIsLoading(false)
    }
  }, [])

  function handleInputChange(value: string) {
    setQuery(value)
    setActiveIndex(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchResults(value)
    }, 300)
  }

  function handleNavigate(path: string) {
    setIsOpen(false)
    setQuery("")
    setResults(null)
    router.push(path)
  }

  function handleClear() {
    setQuery("")
    setResults(null)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasResults =
    results &&
    (Object.keys(CATEGORY_LABELS) as (keyof SearchResults)[]).some(
      (key) => results[key] && results[key].length > 0
    )

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-owns={listboxId}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search..."
          className="w-56 rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 lg:w-72"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-96 rounded-lg border border-slate-200 bg-white shadow-lg max-h-[28rem] overflow-y-auto" role="listbox" id={listboxId} aria-label="Search results">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-slate-400">Searching...</div>
          )}

          {!isLoading && !hasResults && query.trim() && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No results found for &ldquo;{query.trim()}&rdquo;
            </div>
          )}

          {!isLoading &&
            hasResults &&
            (Object.keys(CATEGORY_LABELS) as (keyof SearchResults)[]).map(
              (category) => {
                const items = results[category]
                if (!items || items.length === 0) return null
                return (
                  <div key={category}>
                    <div className="sticky top-0 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      {CATEGORY_LABELS[category]}
                    </div>
                    {items.map((item: Record<string, unknown>) => {
                      const id = item.id as string
                      const path = `${CATEGORY_PATHS[category]}/${id}`
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleNavigate(path)}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                        >
                          <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                            {CATEGORY_LABELS[category]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-900">
                              {renderTitle(category, item)}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {renderSubtitle(category, item)}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              }
            )}
        </div>
      )}
    </div>
  )
}

function renderTitle(
  category: keyof SearchResults,
  item: Record<string, unknown>
): string {
  switch (category) {
    case "contacts":
      return item.name as string
    case "invoices":
      return item.invoiceNumber as string
    case "bills":
      return item.billNumber as string
    case "projects":
      return item.name as string
    case "experiments":
      return item.name as string
    case "accounts":
      return `${item.code} - ${item.name}`
    case "rdActivities":
      return item.name as string
    case "employees":
      return `${item.firstName} ${item.lastName}`
    case "fixedAssets":
      return `${item.assetNumber} - ${item.name}`
    case "inventoryItems":
      return item.name as string
    case "costingProjects":
      return item.code ? `${item.code} - ${item.name}` : (item.name as string)
    case "documents":
      return item.name as string
    case "marketplaceProviders":
      return item.companyName as string
    case "marketplaceListings":
      return item.title as string
    case "marketplaceContracts":
      return item.title as string
    case "migrationJobs":
      return item.name as string
    default:
      return ""
  }
}

function renderSubtitle(
  category: keyof SearchResults,
  item: Record<string, unknown>
): string {
  switch (category) {
    case "contacts":
      return `${item.contactType}${item.email ? ` | ${item.email}` : ""}`
    case "invoices":
      return `${item.status} | $${Number(item.total).toFixed(2)}`
    case "bills":
      return `${item.status} | $${Number(item.total).toFixed(2)}`
    case "projects":
      return item.status as string
    case "experiments":
      return item.status as string
    case "accounts":
      return item.type as string
    case "rdActivities":
      return item.status as string
    case "employees":
      return `${item.status}${item.email ? ` | ${item.email}` : ""}`
    case "fixedAssets":
      return item.status as string
    case "inventoryItems":
      return `${item.sku ? `SKU: ${item.sku} | ` : ""}Qty: ${item.quantityOnHand}`
    case "costingProjects":
      return item.status as string
    case "documents":
      return item.type as string
    case "marketplaceProviders":
      return item.status as string
    case "marketplaceListings":
      return item.status as string
    case "marketplaceContracts":
      return item.status as string
    case "migrationJobs":
      return `${item.status} | ${item.sourceSystem}`
    default:
      return ""
  }
}
