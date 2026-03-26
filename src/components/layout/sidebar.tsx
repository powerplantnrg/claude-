"use client"

import { useState } from "react"
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
  ShieldCheck,
  FileCheck,
  Cloud,
  Server,
  BarChart3,
  Award,
  Calculator,
  Settings,
  ChevronDown,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
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
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Accounting",
    items: [
      { label: "Invoices", href: "/invoices", icon: FileText },
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
      { label: "R&D Expenditure", href: "/reports/rd-expenditure", icon: FlaskConical },
    ],
  },
  {
    title: "R&D Intelligence",
    items: [
      { label: "R&D Dashboard", href: "/rd", icon: FolderKanban },
      { label: "Projects", href: "/rd/projects", icon: GitBranch },
      { label: "Experiments", href: "/rd/experiments", icon: Beaker },
      { label: "Pipeline", href: "/rd/pipeline", icon: GitBranch },
      { label: "Advice", href: "/rd/advice", icon: Lightbulb },
      { label: "Compliance", href: "/rd/compliance", icon: ShieldCheck },
      { label: "Claims", href: "/rd/claims", icon: FileCheck },
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
    title: "System",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const section of navSections) {
      initial[section.title] = true
    }
    return initial
  })

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

  return (
    <aside
      className={cn(
        "flex flex-col bg-slate-900 text-white transition-all duration-300 h-full",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700/50">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <FlaskConical className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">R&D Ledger</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <FlaskConical className="h-4 w-4 text-white" />
            </div>
          </Link>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-8 mx-2 mt-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {navSections.map((section) => (
          <div key={section.title}>
            {/* Section header */}
            {!collapsed ? (
              <button
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center justify-between px-2 py-2 mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
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
            {(collapsed || expandedSections[section.title]) && (
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-indigo-600/20 text-indigo-300"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white",
                          collapsed && "justify-center px-0"
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active && "text-indigo-400")} />
                        {!collapsed && <span>{item.label}</span>}
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
      {!collapsed && (
        <div className="border-t border-slate-700/50 px-4 py-3">
          <p className="text-xs text-slate-500">R&D Accounting Platform</p>
        </div>
      )}
    </aside>
  )
}
