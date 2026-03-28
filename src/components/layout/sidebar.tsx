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
  Webhook,
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
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Command Center", href: "/command-center", icon: Gauge },
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Financial Analytics", href: "/analytics/financial", icon: TrendingUp },
      { label: "R&D ROI", href: "/analytics/rd-roi", icon: FlaskConical },
      { label: "Payroll Insights", href: "/analytics/payroll-insights", icon: Banknote },
      { label: "Cash Flow Intel", href: "/analytics/cash-flow", icon: DollarSign },
    ],
  },
  {
    title: "Accounting",
    items: [
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Quotes", href: "/quotes", icon: FileEdit },
      { label: "Recurring", href: "/invoices/recurring", icon: Repeat },
      { label: "Credit Notes", href: "/invoices/credit-notes", icon: FileMinus },
      { label: "Bills", href: "/bills", icon: Receipt },
      { label: "Recurring Bills", href: "/bills/recurring", icon: Repeat },
      { label: "Banking", href: "/banking", icon: Landmark },
      { label: "Bank Rules", href: "/banking/rules", icon: ListChecks },
      { label: "Chart of Accounts", href: "/accounts", icon: BookOpen },
      { label: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart },
      { label: "Budgets", href: "/budgets", icon: Wallet },
      { label: "Fixed Assets", href: "/assets", icon: Package },
      { label: "Loans", href: "/loans", icon: Landmark },
      { label: "Cost Centers", href: "/cost-centers", icon: GitBranch },
      { label: "Dividends", href: "/dividends", icon: Banknote },
      { label: "Contacts", href: "/contacts", icon: Users },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Inventory", href: "/inventory", icon: Boxes },
      { label: "Stock Takes", href: "/inventory/stock-takes", icon: ClipboardCheck },
      { label: "Reports", href: "/inventory/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Payroll",
    items: [
      { label: "Payroll", href: "/payroll", icon: Banknote },
      { label: "Employees", href: "/payroll/employees", icon: Users },
      { label: "Pay Runs", href: "/payroll/pay-runs", icon: DollarSign },
      { label: "Leave", href: "/payroll/leave", icon: CalendarDays },
      { label: "Tax Strategies", href: "/payroll/tax-strategies", icon: Shield },
      { label: "FBT", href: "/payroll/fbt", icon: Briefcase },
      { label: "Reports", href: "/payroll/reports", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Approvals",
    items: [
      { label: "Approvals", href: "/approvals", icon: CheckSquare },
      { label: "Workflows", href: "/approvals/workflows", icon: GitBranch },
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
      { label: "BAS Preparation", href: "/reports/bas", icon: FileCheck },
      { label: "Tax Summary", href: "/reports/tax-summary", icon: Calculator },
      { label: "R&D Expenditure", href: "/reports/rd-expenditure", icon: FlaskConical },
      { label: "Aged Receivables", href: "/reports/aged-receivables", icon: ClipboardList },
      { label: "Aged Payables", href: "/reports/aged-payables", icon: Receipt },
      { label: "Forecast", href: "/reports/forecast", icon: LineChart },
      { label: "Report Builder", href: "/reports/builder", icon: LayoutDashboard },
    ],
  },
  {
    title: "R&D Intelligence",
    items: [
      { label: "R&D Dashboard", href: "/rd", icon: FolderKanban },
      { label: "Projects", href: "/rd/projects", icon: GitBranch },
      { label: "Experiments", href: "/rd/experiments", icon: Beaker },
      { label: "Pipeline", href: "/rd/pipeline", icon: GitBranch },
      { label: "Portfolio", href: "/rd/portfolio", icon: PieChart },
      { label: "Advice", href: "/rd/advice", icon: Lightbulb },
      { label: "Compliance", href: "/rd/compliance", icon: ShieldCheck },
      { label: "Claims", href: "/rd/claims", icon: FileCheck },
      { label: "Recommendations", href: "/rd/recommendations", icon: Sparkles },
      { label: "Eligibility Wizard", href: "/rd/eligibility", icon: ClipboardCheck },
      { label: "Knowledge Base", href: "/rd/knowledge", icon: BookMarked },
      { label: "Templates", href: "/rd/templates", icon: LayoutTemplate },
    ],
  },
  {
    title: "Documents",
    items: [
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    title: "Integrations",
    items: [
      { label: "Integration Hub", href: "/integrations", icon: Plug },
      { label: "Bank Feeds", href: "/integrations/bank-feeds", icon: Landmark },
      { label: "STP Filing", href: "/integrations/stp", icon: FileSpreadsheet },
      { label: "Data Export", href: "/integrations/export", icon: FileBarChart },
      { label: "Data Migration", href: "/migration", icon: ArrowRightLeft },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { label: "Marketplace", href: "/marketplace", icon: Store },
      { label: "Specialists", href: "/marketplace/providers", icon: Users },
      { label: "Requirements", href: "/marketplace/requirements", icon: ClipboardList },
      { label: "Listings", href: "/marketplace/listings", icon: FileText },
      { label: "Contracts", href: "/marketplace/contracts", icon: Briefcase },
      { label: "Financing", href: "/marketplace/financing", icon: DollarSign },
    ],
  },
  {
    title: "AI Costs",
    items: [
      { label: "Cloud Dashboard", href: "/cloud", icon: Cloud },
      { label: "Providers", href: "/cloud/providers", icon: Server },
      { label: "Usage", href: "/cloud/usage", icon: BarChart3 },
    ],
  },
  {
    title: "Incentives",
    items: [
      { label: "Grants", href: "/grants", icon: Award },
      { label: "Scenarios", href: "/scenarios", icon: Calculator },
    ],
  },
  {
    title: "Projects",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Time Tracking", href: "/time-tracking", icon: Activity },
      { label: "Reports", href: "/projects/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Sustainability",
    items: [
      { label: "Carbon", href: "/carbon", icon: Leaf },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Data Room", href: "/data-room", icon: FolderOpen },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Audit Log", href: "/settings/audit-log", icon: ScrollText },
      { label: "Users", href: "/settings/users", icon: Users },
      { label: "Activity", href: "/settings/activity", icon: Activity },
      { label: "Integrations", href: "/settings/integrations", icon: Plug },
      { label: "Currencies", href: "/settings/currencies", icon: Coins },
      { label: "Webhooks", href: "/settings/webhooks", icon: Webhook },
      { label: "Period Locking", href: "/settings/periods", icon: Lock },
      { label: "Year-End Close", href: "/settings/year-end", icon: CalendarCheck },
      { label: "Reminders", href: "/settings/reminders", icon: CalendarDays },
    ],
  },
  {
    title: "Compliance",
    items: [
      { label: "Compliance", href: "/compliance", icon: ShieldCheck },
    ],
  },
]

// Color coding for each section to give subtle visual differentiation
const sectionIconColors: Record<string, string> = {
  Overview: "text-sky-400",
  Accounting: "text-emerald-400",
  Inventory: "text-amber-400",
  Payroll: "text-violet-400",
  Approvals: "text-rose-400",
  Reports: "text-cyan-400",
  "R&D Intelligence": "text-fuchsia-400",
  Documents: "text-orange-400",
  Integrations: "text-teal-400",
  Marketplace: "text-pink-400",
  "AI Costs": "text-indigo-400",
  Incentives: "text-yellow-400",
  Projects: "text-blue-400",
  Sustainability: "text-green-400",
  System: "text-slate-400",
  Compliance: "text-red-400",
}

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

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
  const iconColor = sectionIconColors[section.title] || "text-slate-400"
  const hasActiveItem = section.items.some((item) => isActive(item.href))

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [section.items])

  // In collapsed mode, always show items (icon-only)
  if (effectiveCollapsed) {
    return (
      <div className="mt-1">
        <div className="my-1.5 mx-2 border-t border-white/[0.04]" />
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
                      ? "bg-indigo-500/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(99,102,241,0.08)]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-400 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                  )}
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-all duration-150",
                      active ? "text-indigo-300 drop-shadow-[0_0_3px_rgba(129,140,248,0.3)]" : iconColor,
                      !active && "group-hover/tip:scale-110"
                    )}
                  />
                </Link>
                {/* Tooltip */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-medium rounded-lg shadow-2xl shadow-black/40 opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-all duration-150 whitespace-nowrap z-50 border border-white/[0.06] backdrop-blur-xl scale-95 group-hover/tip:scale-100 origin-left">
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
    <div className="mt-1">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-1.5 mt-2 mb-0.5 group/header rounded-md hover:bg-white/[0.02] transition-colors duration-150"
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
                      ? "bg-indigo-500/[0.1] text-white shadow-[inset_0_0_0_1px_rgba(99,102,241,0.06)]"
                      : "text-slate-400 hover:bg-white/[0.035] hover:text-slate-200"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-400 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                  )}
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-all duration-150",
                      active
                        ? "text-indigo-400 drop-shadow-[0_0_3px_rgba(129,140,248,0.3)]"
                        : cn(iconColor, "group-hover/item:translate-x-[2px]")
                    )}
                  />
                  <span className={cn(
                    "truncate transition-colors duration-150",
                    active && "text-white/95"
                  )}>
                    {item.label}
                  </span>
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

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const section of navSections) {
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

  // Track scroll state for glass morphism header
  useEffect(() => {
    const navEl = navRef.current
    if (!navEl) return
    function onScroll() {
      setScrolled((navEl?.scrollTop ?? 0) > 8)
    }
    navEl.addEventListener("scroll", onScroll, { passive: true })
    return () => navEl.removeEventListener("scroll", onScroll)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const effectiveCollapsed = isTablet || collapsed

  const toggleSection = useCallback((title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }, [])

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname === href || pathname.startsWith(href + "/")
  }

  const sidebarContent = (
    <div className="flex flex-col h-full relative">
      {/* Top gradient line accent */}
      <div className="h-[2px] shrink-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-80" />

      {/* Brand Area */}
      <div className={cn(
        "shrink-0 transition-all duration-200",
        effectiveCollapsed ? "px-2 py-4" : "px-4 py-4"
      )}>
        {!effectiveCollapsed ? (
          <Link href="/dashboard" className="flex items-center gap-3 group/brand" onClick={onMobileClose}>
            <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 transition-shadow duration-300 group-hover/brand:shadow-indigo-500/40">
              <Image src="/logo.svg" alt="R&D Financial OS" width={20} height={20} className="h-5 w-5 brightness-0 invert" />
              <div className="absolute inset-0 rounded-xl bg-white/[0.08] opacity-0 group-hover/brand:opacity-100 transition-opacity duration-300" />
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
            <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 transition-shadow duration-300 group-hover/brand:shadow-indigo-500/40">
              <Image src="/logo.svg" alt="R&D Financial OS" width={20} height={20} className="h-5 w-5 brightness-0 invert" />
              <div className="absolute inset-0 rounded-xl bg-white/[0.08] opacity-0 group-hover/brand:opacity-100 transition-opacity duration-300" />
            </div>
          </Link>
        )}
      </div>

      {/* Separator below brand */}
      <div className={cn("shrink-0 mx-3", effectiveCollapsed && "mx-2")}>
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
      </div>

      {/* Search Quick Access */}
      {!effectiveCollapsed ? (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <button className="flex w-full items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-md px-3 py-2 text-[13px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>
      ) : (
        <div className="px-1.5 pt-3 pb-1 shrink-0">
          <button className="relative group/search flex justify-center w-full rounded-lg py-2 text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-150">
            <Search className="h-[18px] w-[18px]" />
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-medium rounded-lg shadow-2xl shadow-black/40 opacity-0 pointer-events-none group-hover/search:opacity-100 transition-all duration-150 whitespace-nowrap z-50 border border-white/[0.06] backdrop-blur-xl scale-95 group-hover/search:scale-100 origin-left">
              Search
              <span className="ml-2 text-slate-400 font-normal">Cmd+K</span>
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900/95" />
            </div>
          </button>
        </div>
      )}

      {/* Collapse toggle - hidden on mobile and tablet */}
      {!effectiveCollapsed ? (
        <div className="px-3 pt-1 pb-0 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center gap-2 w-full rounded-lg px-3 py-1.5 text-[12px] text-slate-500/70 hover:text-slate-300 hover:bg-white/[0.03] transition-all duration-150"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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

      {/* Glass morphism scroll indicator */}
      <div
        className={cn(
          "shrink-0 h-6 -mb-6 relative z-10 pointer-events-none transition-opacity duration-200",
          scrolled ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: "linear-gradient(to bottom, rgb(2 6 23 / 0.9) 0%, transparent 100%)",
          backdropFilter: scrolled ? "blur(8px)" : "none",
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
        {navSections.map((section) => (
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
        {/* Bottom padding for scroll */}
        <div className="h-2" />
      </nav>

      {/* Footer */}
      <div className={cn(
        "shrink-0",
        effectiveCollapsed ? "px-1.5 py-3" : "px-3 py-3"
      )}>
        {/* Separator */}
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
              <span className="text-[11px] text-slate-600/70 font-medium">R&D Accounting Platform</span>
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
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-medium rounded-lg shadow-2xl shadow-black/40 opacity-0 pointer-events-none group-hover/help:opacity-100 transition-all duration-150 whitespace-nowrap z-50 border border-white/[0.06] backdrop-blur-xl scale-95 group-hover/help:scale-100 origin-left">
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
      {/* Sidebar scrollbar styles */}
      <style jsx global>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgb(51 65 85 / 0.5);
          border-radius: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgb(71 85 105 / 0.7);
        }
        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgb(51 65 85 / 0.5) transparent;
        }
      `}</style>

      {/* Desktop / Tablet sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative",
          effectiveCollapsed ? "w-[60px]" : "w-[260px]"
        )}
        style={{
          background: "linear-gradient(180deg, rgb(2 6 23) 0%, rgb(6 10 28) 50%, rgb(8 12 32) 100%)",
          backgroundImage: `
            linear-gradient(180deg, rgb(2 6 23) 0%, rgb(6 10 28) 50%, rgb(8 12 32) 100%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")
          `,
        }}
      >
        {/* Subtle right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-white/[0.04]" />
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden transition-all duration-300",
          mobileOpen ? "visible" : "invisible pointer-events-none"
        )}
      >
        {/* Backdrop with blur */}
        <div
          className={cn(
            "fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={onMobileClose}
        />
        {/* Sidebar panel - slide in with spring-like cubic-bezier */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 flex w-[280px] flex-col shadow-2xl shadow-black/60 transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          style={{
            background: "linear-gradient(180deg, rgb(2 6 23) 0%, rgb(6 10 28) 50%, rgb(8 12 32) 100%)",
            backgroundImage: `
              linear-gradient(180deg, rgb(2 6 23) 0%, rgb(6 10 28) 50%, rgb(8 12 32) 100%),
              url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")
            `,
          }}
        >
          {/* Close button */}
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
