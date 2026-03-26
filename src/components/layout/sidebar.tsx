"use client"

import { useState, useEffect } from "react"
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
    ],
  },
  {
    title: "Accounting",
    items: [
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Recurring", href: "/invoices/recurring", icon: Repeat },
      { label: "Bills", href: "/bills", icon: Receipt },
      { label: "Banking", href: "/banking", icon: Landmark },
      { label: "Chart of Accounts", href: "/accounts", icon: BookOpen },
      { label: "Contacts", href: "/contacts", icon: Users },
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
    ],
  },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
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

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const effectiveCollapsed = isTablet || collapsed

  function toggleSection(title: string) {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname === href || pathname.startsWith(href + "/")
  }

  const sidebarContent = (
    <>
      {/* Logo / Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700/50">
        {!effectiveCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onMobileClose}>
            <Image src="/logo.svg" alt="R&D Financial OS" width={32} height={32} className="h-8 w-8" />
            <span className="text-base font-semibold tracking-tight">R&D Ledger</span>
          </Link>
        )}
        {effectiveCollapsed && (
          <Link href="/dashboard" className="mx-auto" onClick={onMobileClose}>
            <Image src="/logo.svg" alt="R&D Financial OS" width={32} height={32} className="h-8 w-8" />
          </Link>
        )}
      </div>

      {/* Collapse toggle - hidden on mobile and tablet */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center h-8 mx-2 mt-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1" role="navigation" aria-label="Main navigation">
        {navSections.map((section) => (
          <div key={section.title}>
            {/* Section header */}
            {!effectiveCollapsed ? (
              <button
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center justify-between px-2 py-2 mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
                aria-expanded={expandedSections[section.title]}
              >
                <span>{section.title}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    expandedSections[section.title] ? "" : "-rotate-90"
                  )}
                />
              </button>
            ) : (
              <div className="my-2 mx-2 border-t border-slate-700/50" />
            )}

            {/* Section items */}
            {(effectiveCollapsed || expandedSections[section.title]) && (
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onMobileClose}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-indigo-600/20 text-indigo-300"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white",
                          effectiveCollapsed && "justify-center px-0"
                        )}
                        title={effectiveCollapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active && "text-indigo-400")} />
                        {!effectiveCollapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!effectiveCollapsed && (
        <div className="border-t border-slate-700/50 px-4 py-3">
          <p className="text-xs text-slate-500">R&D Accounting Platform</p>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop / Tablet sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-slate-900 text-white transition-all duration-300 h-full",
          effectiveCollapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onMobileClose}
          />
          {/* Sidebar panel */}
          <aside className="fixed inset-y-0 left-0 flex w-64 flex-col bg-slate-900 text-white shadow-xl">
            {/* Close button */}
            <button
              onClick={onMobileClose}
              className="absolute right-2 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
