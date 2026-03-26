"use client"

import { Fragment, useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  ChevronRight,
  User,
  LogOut,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  invoices: "Invoices",
  bills: "Bills",
  banking: "Banking",
  accounts: "Chart of Accounts",
  contacts: "Contacts",
  reports: "Reports",
  "profit-loss": "Profit & Loss",
  "balance-sheet": "Balance Sheet",
  "trial-balance": "Trial Balance",
  "cash-flow": "Cash Flow",
  "gst-bas": "GST/BAS",
  "rd-expenditure": "R&D Expenditure",
  rd: "R&D Intelligence",
  projects: "Projects",
  experiments: "Experiments",
  pipeline: "Pipeline",
  advice: "Advice",
  compliance: "Compliance",
  claims: "Claims",
  cloud: "AI Costs",
  providers: "Providers",
  usage: "Usage",
  grants: "Grants",
  scenarios: "Scenarios",
  settings: "Settings",
}

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { label: string; href: string }[] = []

  let currentPath = ""
  for (const segment of segments) {
    currentPath += `/${segment}`
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    crumbs.push({ label, href: currentPath })
  }

  return crumbs
}

export function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const breadcrumbs = buildBreadcrumbs(pathname)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = session?.user as any
  const organizationName = u?.organizationName || "Organization"
  const userName = u?.name || u?.email || "User"
  const userRole = u?.role as string | undefined
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm">
        {breadcrumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 && (
              <ChevronRight className="mx-2 h-3.5 w-3.5 text-slate-400" />
            )}
            <span
              className={cn(
                "font-medium",
                index === breadcrumbs.length - 1
                  ? "text-slate-900"
                  : "text-slate-500"
              )}
            >
              {crumb.label}
            </span>
          </Fragment>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Organization */}
        <div className="hidden items-center gap-1.5 text-sm text-slate-600 sm:flex">
          <Building2 className="h-4 w-4 text-slate-400" />
          <span>{organizationName}</span>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {initials}
            </div>
            <span className="hidden font-medium text-slate-700 sm:block">
              {userName}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{userName}</p>
                {userRole && (
                  <p className="text-xs text-slate-500 capitalize">{userRole}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">{session?.user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
