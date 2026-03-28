"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Landmark,
  BookOpen,
  Users,
  TrendingUp,
  Scale,
  ClipboardList,
  DollarSign,
  FileBarChart,
  FlaskConical,
  FolderKanban,
  Beaker,
  GitBranch,
  Lightbulb,
  PieChart,
  ShieldCheck,
  FileCheck,
  Cloud,
  Server,
  BarChart3,
  Award,
  Calculator,
  FolderOpen,
  Leaf,
  Gauge,
  Settings,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  X,
  ScrollText,
  Activity,
  Sparkles,
  ClipboardCheck,
  Repeat,
  FileMinus,
  ListChecks,
  ArrowRightLeft,
  Plug,
  Wallet,
  LineChart,
  ShoppingCart,
  BookMarked,
  LayoutTemplate,
  Banknote,
  CalendarDays,
  Shield,
  FileSpreadsheet,
  Briefcase,
  CheckSquare,
  Coins,
  Package,
  Boxes,
  Store,
  FileEdit,
  CalendarCheck,
  Lock,
  Search,
  Command,
  HelpCircle,
  Zap,
  CircleDollarSign,
  Microscope,
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

type ViewMode = "accounting" | "rd"

// ─── Navigation Structures ────────────────────────────────────────────

const accountingSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Quotes", href: "/quotes", icon: FileEdit },
      { label: "Recurring", href: "/invoices/recurring", icon: Repeat },
      { label: "Credit Notes", href: "/invoices/credit-notes", icon: FileMinus },
    ],
  },
  {
    title: "Purchases",
    items: [
      { label: "Bills", href: "/bills", icon: Receipt },
      { label: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart },
      { label: "Recurring Bills", href: "/bills/recurring", icon: Repeat },
    ],
  },
  {
    title: "Banking",
    items: [
      { label: "Bank Accounts", href: "/banking", icon: Landmark },
      { label: "Bank Rules", href: "/banking/rules", icon: ListChecks },
      { label: "Payments", href: "/payments", icon: DollarSign },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Contacts", href: "/contacts", icon: Users },
      { label: "Payroll", href: "/payroll", icon: Banknote },
      { label: "Employees", href: "/payroll/employees", icon: Users },
      { label: "Pay Runs", href: "/payroll/pay-runs", icon: DollarSign },
      { label: "Leave", href: "/payroll/leave", icon: CalendarDays },
    ],
  },
  {
    title: "Assets & Inventory",
    items: [
      { label: "Fixed Assets", href: "/assets", icon: Package },
      { label: "Inventory", href: "/inventory", icon: Boxes },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "P&L", href: "/reports/profit-loss", icon: TrendingUp },
      { label: "Balance Sheet", href: "/reports/balance-sheet", icon: Scale },
      { label: "Trial Balance", href: "/reports/trial-balance", icon: ClipboardList },
      { label: "Cash Flow", href: "/reports/cash-flow", icon: DollarSign },
      { label: "GST/BAS", href: "/reports/gst", icon: FileBarChart },
      { label: "Tax Summary", href: "/reports/tax-summary", icon: Calculator },
      { label: "Aged Receivables", href: "/reports/aged-receivables", icon: ClipboardList },
      { label: "Aged Payables", href: "/reports/aged-payables", icon: Receipt },
      { label: "Forecast", href: "/reports/forecast", icon: LineChart },
    ],
  },
  {
    title: "Accounting",
    items: [
      { label: "Chart of Accounts", href: "/accounts", icon: BookOpen },
      { label: "Budgets", href: "/budgets", icon: Wallet },
      { label: "Cost Centers", href: "/cost-centers", icon: GitBranch },
      { label: "Loans", href: "/loans", icon: Landmark },
      { label: "Dividends", href: "/dividends", icon: Banknote },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Approvals", href: "/approvals", icon: CheckSquare },
      { label: "Integrations", href: "/integrations", icon: Plug },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

const rdSections: NavSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "Command Center", href: "/command-center", icon: Gauge },
      { label: "R&D Dashboard", href: "/rd", icon: FolderKanban },
      { label: "R&D ROI", href: "/analytics/rd-roi", icon: FlaskConical },
    ],
  },
  {
    title: "Projects & Research",
    items: [
      { label: "Projects", href: "/rd/projects", icon: GitBranch },
      { label: "Experiments", href: "/rd/experiments", icon: Beaker },
      { label: "Pipeline", href: "/rd/pipeline", icon: GitBranch },
      { label: "Portfolio", href: "/rd/portfolio", icon: PieChart },
      { label: "Time Tracking", href: "/time-tracking", icon: Activity },
    ],
  },
  {
    title: "Claims & Compliance",
    items: [
      { label: "Claims", href: "/rd/claims", icon: FileCheck },
      { label: "Compliance", href: "/rd/compliance", icon: ShieldCheck },
      { label: "Eligibility Wizard", href: "/rd/eligibility", icon: ClipboardCheck },
      { label: "R&D Expenditure", href: "/reports/rd-expenditure", icon: FlaskConical },
    ],
  },
  {
    title: "Knowledge & AI",
    items: [
      { label: "Advice", href: "/rd/advice", icon: Lightbulb },
      { label: "Recommendations", href: "/rd/recommendations", icon: Sparkles },
      { label: "Knowledge Base", href: "/rd/knowledge", icon: BookMarked },
      { label: "Templates", href: "/rd/templates", icon: LayoutTemplate },
    ],
  },
  {
    title: "Cloud & Costs",
    items: [
      { label: "Cloud Dashboard", href: "/cloud", icon: Cloud },
      { label: "Providers", href: "/cloud/providers", icon: Server },
      { label: "Usage", href: "/cloud/usage", icon: BarChart3 },
    ],
  },
  {
    title: "Marketplace & Grants",
    items: [
      { label: "Marketplace", href: "/marketplace", icon: Store },
      { label: "Grants", href: "/grants", icon: Award },
      { label: "Scenarios", href: "/scenarios", icon: Calculator },
    ],
  },
  {
    title: "Sustainability",
    items: [
      { label: "Carbon", href: "/carbon", icon: Leaf },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Financial Analytics", href: "/analytics/financial", icon: TrendingUp },
      { label: "Cash Flow Intel", href: "/analytics/cash-flow", icon: DollarSign },
      { label: "Payroll Insights", href: "/analytics/payroll-insights", icon: Banknote },
      { label: "Report Builder", href: "/reports/builder", icon: LayoutDashboard },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Data Room", href: "/data-room", icon: FolderOpen },
      { label: "Migration", href: "/migration", icon: ArrowRightLeft },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

// Section color coding
const sectionColors: Record<string, string> = {
  Overview: "text-sky-400",
  Sales: "text-emerald-400",
  Purchases: "text-amber-400",
  Banking: "text-blue-400",
  People: "text-violet-400",
  "Assets & Inventory": "text-orange-400",
  Reports: "text-cyan-400",
  Accounting: "text-teal-400",
  System: "text-slate-400",
  Intelligence: "text-fuchsia-400",
  "Projects & Research": "text-indigo-400",
  "Claims & Compliance": "text-rose-400",
  "Knowledge & AI": "text-purple-400",
  "Cloud & Costs": "text-sky-400",
  "Marketplace & Grants": "text-pink-400",
  Sustainability: "text-green-400",
  Analytics: "text-cyan-400",
}

// ─── Collapsible Section ──────────────────────────────────────────────

function CollapsibleSection({
  section,
  expanded,
  onToggle,
  effectiveCollapsed,
  pathname,
  onMobileClose,
  isActive,
}: {
  section: NavSection
  expanded: boolean
  onToggle: () => void
  effectiveCollapsed: boolean
  pathname: string
  onMobileClose?: () => void
  isActive: (href: string) => boolean
}) {
  const contentRef = useRef<HTMLUListElement>(null)
  const [contentHeight, setContentHeight] = useState<number>(0)
  const iconColor = sectionColors[section.title] || "text-slate-400"
  const hasActiveItem = section.items.some((item) => isActive(item.href))

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [section.items])

  if (effectiveCollapsed) {
    return (
      <div className="mt-1">
        <div className="my-1 mx-2 border-t border-white/[0.04]" />
        <ul className="space-y-0.5">
          {section.items.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <li key={item.href} className="relative group/tip">
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "relative flex items-center justify-center rounded-lg py-2 mx-0.5 transition-all duration-150",
                    active
                      ? "bg-indigo-500/[0.12] text-white"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-400" />
                  )}
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-indigo-300" : iconColor)} />
                </Link>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-medium rounded-lg shadow-2xl opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-all duration-150 whitespace-nowrap z-50 border border-white/[0.06] backdrop-blur-xl scale-95 group-hover/tip:scale-100 origin-left">
                  {item.label}
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900/95" />
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="mt-0.5">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-1.5 mt-1.5 mb-0.5 group/header rounded-md hover:bg-white/[0.02] transition-colors duration-150"
        aria-expanded={expanded}
      >
        <span className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors duration-150",
          hasActiveItem ? "text-slate-400" : "text-slate-500/80",
          "group-hover/header:text-slate-300"
        )}>
          {section.title}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-slate-600/60 transition-all duration-200 ease-out group-hover/header:text-slate-400",
            expanded ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          maxHeight: expanded ? `${contentHeight + 8}px` : "0px",
          opacity: expanded ? 1 : 0,
        }}
      >
        <ul ref={contentRef} className="space-y-[1px]">
          {section.items.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all duration-150 group/item",
                    active
                      ? "bg-indigo-500/[0.1] text-white"
                      : "text-slate-400 hover:bg-white/[0.035] hover:text-slate-200"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-400" />
                  )}
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-all duration-150",
                      active
                        ? "text-indigo-400"
                        : cn(iconColor, "group-hover/item:translate-x-[1px]")
                    )}
                  />
                  <span className={cn("truncate", active && "text-white/95")}>{item.label}</span>
                  {active && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-indigo-400/60" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// ─── View Switcher ────────────────────────────────────────────────────

function ViewSwitcher({
  view,
  onChange,
  collapsed,
}: {
  view: ViewMode
  onChange: (view: ViewMode) => void
  collapsed: boolean
}) {
  if (collapsed) {
    return (
      <div className="px-1.5 pt-2 pb-1 shrink-0">
        <button
          onClick={() => onChange(view === "accounting" ? "rd" : "accounting")}
          className="relative group/switch flex justify-center w-full rounded-lg py-2 transition-all duration-200"
        >
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300",
            view === "accounting"
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-fuchsia-500/15 text-fuchsia-400"
          )}>
            {view === "accounting" ? (
              <CircleDollarSign className="h-4 w-4" />
            ) : (
              <Microscope className="h-4 w-4" />
            )}
          </div>
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-medium rounded-lg shadow-2xl opacity-0 pointer-events-none group-hover/switch:opacity-100 transition-all duration-150 whitespace-nowrap z-50 border border-white/[0.06] backdrop-blur-xl scale-95 group-hover/switch:scale-100 origin-left">
            Switch to {view === "accounting" ? "R&D" : "Accounting"}
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900/95" />
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="px-3 pt-2 pb-1 shrink-0">
      <div className="relative flex rounded-xl bg-white/[0.04] border border-white/[0.06] p-0.5">
        {/* Sliding indicator */}
        <div
          className={cn(
            "absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            view === "accounting"
              ? "left-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
              : "left-[calc(50%+2px)] bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/20 shadow-[0_0_12px_rgba(217,70,239,0.1)]"
          )}
        />
        <button
          onClick={() => onChange("accounting")}
          className={cn(
            "relative z-10 flex-1 flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-200",
            view === "accounting"
              ? "text-emerald-400"
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          <CircleDollarSign className="h-3.5 w-3.5" />
          <span>Accounting</span>
        </button>
        <button
          onClick={() => onChange("rd")}
          className={cn(
            "relative z-10 flex-1 flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-200",
            view === "rd"
              ? "text-fuchsia-400"
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Microscope className="h-3.5 w-3.5" />
          <span>R&D</span>
        </button>
      </div>
    </div>
  )
}

// ─── Main Sidebar ─────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  // Determine view based on URL or user preference
  const [view, setView] = useState<ViewMode>(() => {
    // Auto-detect from URL on initial render
    if (typeof window !== "undefined") {
      const path = window.location.pathname
      if (
        path.startsWith("/rd") ||
        path.startsWith("/command-center") ||
        path.startsWith("/cloud") ||
        path.startsWith("/carbon") ||
        path.startsWith("/marketplace") ||
        path.startsWith("/grants") ||
        path.startsWith("/scenarios") ||
        path.startsWith("/data-room") ||
        path.startsWith("/migration") ||
        path.startsWith("/analytics/rd-roi")
      ) {
        return "rd"
      }
    }
    return "accounting"
  })

  const sections = view === "accounting" ? accountingSections : rdSections

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const section of [...accountingSections, ...rdSections]) {
      initial[section.title] = true
    }
    return initial
  })

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth
      setIsTablet(w >= 768 && w < 1024)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const navEl = navRef.current
    if (!navEl) return
    function onScroll() {
      setScrolled((navEl?.scrollTop ?? 0) > 8)
    }
    navEl.addEventListener("scroll", onScroll, { passive: true })
    return () => navEl.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    onMobileClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Auto-switch view when navigating to a section in the other view
  useEffect(() => {
    const rdPaths = ["/rd", "/command-center", "/cloud", "/carbon", "/marketplace", "/grants", "/scenarios", "/data-room", "/migration", "/analytics/rd-roi"]
    const isRdPath = rdPaths.some((p) => pathname.startsWith(p))
    if (isRdPath && view !== "rd") setView("rd")
    // Don't auto-switch back - let user stay in their chosen view
  }, [pathname, view])

  const effectiveCollapsed = isTablet || collapsed

  const toggleSection = useCallback((title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }))
  }, [])

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const sidebarContent = (
    <div className="flex flex-col h-full relative">
      {/* Top accent line */}
      <div className={cn(
        "h-[2px] shrink-0 bg-gradient-to-r opacity-80",
        view === "accounting"
          ? "from-emerald-500 via-teal-500 to-cyan-500"
          : "from-fuchsia-500 via-violet-500 to-indigo-500"
      )} />

      {/* Brand */}
      <div className={cn(
        "shrink-0 transition-all duration-200",
        effectiveCollapsed ? "px-2 py-4" : "px-4 py-4"
      )}>
        {!effectiveCollapsed ? (
          <Link href="/dashboard" className="flex items-center gap-3 group/brand" onClick={onMobileClose}>
            <div className={cn(
              "relative flex items-center justify-center h-9 w-9 rounded-xl shadow-lg transition-shadow duration-300 group-hover/brand:shadow-indigo-500/40",
              view === "accounting"
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
                : "bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-fuchsia-500/25"
            )}>
              <Image src="/logo.svg" alt="R&D Financial OS" width={20} height={20} className="h-5 w-5 brightness-0 invert" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                R&D Ledger
              </span>
              <span className="text-[10px] text-slate-500/80 font-medium -mt-0.5 tracking-wide">Financial OS</span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="flex justify-center group/brand" onClick={onMobileClose}>
            <div className={cn(
              "relative flex items-center justify-center h-9 w-9 rounded-xl shadow-lg transition-shadow duration-300",
              view === "accounting"
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
                : "bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-fuchsia-500/25"
            )}>
              <Image src="/logo.svg" alt="R&D Financial OS" width={20} height={20} className="h-5 w-5 brightness-0 invert" />
            </div>
          </Link>
        )}
      </div>

      {/* Separator */}
      <div className={cn("shrink-0 mx-3", effectiveCollapsed && "mx-2")}>
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
      </div>

      {/* View Switcher */}
      <ViewSwitcher view={view} onChange={setView} collapsed={effectiveCollapsed} />

      {/* Separator below switcher */}
      <div className={cn("shrink-0 mx-3 mt-1", effectiveCollapsed && "mx-2")}>
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
      </div>

      {/* Search */}
      {!effectiveCollapsed ? (
        <div className="px-3 pt-2 pb-0 shrink-0">
          <button className="flex w-full items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[13px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>
      ) : (
        <div className="px-1.5 pt-2 pb-0 shrink-0">
          <button className="relative group/search flex justify-center w-full rounded-lg py-2 text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-150">
            <Search className="h-[18px] w-[18px]" />
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-medium rounded-lg shadow-2xl opacity-0 pointer-events-none group-hover/search:opacity-100 transition-all duration-150 whitespace-nowrap z-50 border border-white/[0.06] backdrop-blur-xl scale-95 group-hover/search:scale-100 origin-left">
              Search <span className="ml-2 text-slate-400 font-normal">Cmd+K</span>
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900/95" />
            </div>
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      {!effectiveCollapsed ? (
        <div className="px-3 pt-1 pb-0 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center gap-2 w-full rounded-lg px-3 py-1.5 text-[12px] text-slate-500/70 hover:text-slate-300 hover:bg-white/[0.03] transition-all duration-150"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
            <span>Collapse</span>
          </button>
        </div>
      ) : (
        <div className="px-1.5 pt-1 pb-0 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex justify-center w-full rounded-lg py-2 text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-150"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
        </div>
      )}

      {/* Scroll shadow */}
      <div
        className={cn(
          "shrink-0 h-6 -mb-6 relative z-10 pointer-events-none transition-opacity duration-200",
          scrolled ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: "linear-gradient(to bottom, rgb(2 6 23 / 0.9) 0%, transparent 100%)",
        }}
      />

      {/* Navigation */}
      <nav
        ref={navRef}
        className={cn(
          "flex-1 overflow-y-auto py-1 sidebar-scroll",
          effectiveCollapsed ? "px-1.5" : "px-2"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {sections.map((section) => (
          <CollapsibleSection
            key={section.title}
            section={section}
            expanded={expandedSections[section.title]}
            onToggle={() => toggleSection(section.title)}
            effectiveCollapsed={effectiveCollapsed}
            pathname={pathname}
            onMobileClose={onMobileClose}
            isActive={isActive}
          />
        ))}
        <div className="h-2" />
      </nav>

      {/* Footer */}
      <div className={cn("shrink-0", effectiveCollapsed ? "px-1.5 py-3" : "px-3 py-3")}>
        <div className={cn("mb-3", effectiveCollapsed ? "mx-1" : "mx-1")}>
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
        </div>

        {!effectiveCollapsed ? (
          <div className="space-y-2">
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-slate-500/80 hover:text-slate-300 hover:bg-white/[0.03] transition-all duration-150 group/help">
              <HelpCircle className="h-4 w-4 transition-colors duration-150 group-hover/help:text-indigo-400" />
              <span>Help & Support</span>
            </button>
            <div className="flex items-center justify-between px-2.5 py-1">
              <span className="text-[11px] text-slate-600/70 font-medium">
                {view === "accounting" ? "Accounting" : "R&D Intelligence"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                <Zap className="h-2.5 w-2.5 text-indigo-400/80" />
                v1.0
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button className="relative group/help flex justify-center w-full rounded-lg py-2 text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-150">
              <HelpCircle className="h-[18px] w-[18px]" />
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-medium rounded-lg shadow-2xl opacity-0 pointer-events-none group-hover/help:opacity-100 transition-all duration-150 whitespace-nowrap z-50 border border-white/[0.06] backdrop-blur-xl">
                Help & Support
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900/95" />
              </div>
            </button>
            <span className="text-[9px] font-semibold text-slate-600/60 tracking-wide">v1.0</span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <style jsx global>{`
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgb(51 65 85 / 0.5); border-radius: 4px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgb(71 85 105 / 0.7); }
        .sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgb(51 65 85 / 0.5) transparent; }
      `}</style>

      {/* Desktop / Tablet sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative",
          effectiveCollapsed ? "w-[60px]" : "w-[260px]"
        )}
        style={{
          background: "linear-gradient(180deg, rgb(2 6 23) 0%, rgb(6 10 28) 50%, rgb(8 12 32) 100%)",
        }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-px bg-white/[0.04]" />
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden transition-all duration-300",
          mobileOpen ? "visible" : "invisible pointer-events-none"
        )}
      >
        <div
          className={cn(
            "fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={onMobileClose}
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 flex w-[280px] flex-col shadow-2xl shadow-black/60 transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          style={{
            background: "linear-gradient(180deg, rgb(2 6 23) 0%, rgb(6 10 28) 50%, rgb(8 12 32) 100%)",
          }}
        >
          <button
            onClick={onMobileClose}
            className="absolute right-3 top-[18px] z-10 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-150"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
          {sidebarContent}
        </aside>
      </div>
    </>
  )
}
