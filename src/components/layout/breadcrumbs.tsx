"use client"

import { Fragment } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const routeLabels: Record<string, string> = {
  // Core
  dashboard: "Dashboard",
  invoices: "Invoices",
  bills: "Bills",
  banking: "Banking",
  accounts: "Chart of Accounts",
  contacts: "Contacts",
  payments: "Payments",
  expenses: "Expense Claims",
  "journal-entries": "Journal Entries",

  // Reports
  reports: "Reports",
  "profit-loss": "Profit & Loss",
  "profit-loss-comparison": "P&L Comparison",
  "balance-sheet": "Balance Sheet",
  "balance-sheet-comparison": "Balance Sheet Comparison",
  "trial-balance": "Trial Balance",
  "cash-flow": "Cash Flow",
  "gst-bas": "GST/BAS",
  gst: "GST Report",
  bas: "BAS Report",
  "rd-expenditure": "R&D Expenditure",
  "rd-comparison": "R&D Comparison",
  "aged-receivables": "Aged Receivables",
  "aged-payables": "Aged Payables",
  "tax-summary": "Tax Summary",
  "financial-dashboard": "Financial Dashboard",
  history: "History",

  // R&D Intelligence
  rd: "R&D",
  projects: "Projects",
  experiments: "Experiments",
  pipeline: "Pipeline",
  portfolio: "Portfolio",
  advice: "Advice",
  compliance: "Compliance",
  claims: "Claims",
  eligibility: "Eligibility",
  recommendations: "Recommendations",
  activities: "Activities",
  evidence: "Evidence",
  time: "Time Tracking",

  // AI / Cloud
  cloud: "AI Infrastructure Costs",
  providers: "Providers",
  usage: "Usage",

  // Financial tools
  grants: "Grants & Incentives",
  scenarios: "Scenario Simulator",
  carbon: "Carbon Accounting",
  "command-center": "Command Center",
  "data-room": "Investor Data Room",

  // Settings
  settings: "Settings",
  users: "Users",
  currencies: "Currencies",
  "audit-log": "Audit Log",
  activity: "Activity",

  // Actions
  new: "New",
  edit: "Edit",
  import: "Import",
  print: "Print",
  recurring: "Recurring",
}

/** Segments that look like UUIDs or other dynamic IDs */
function isDynamicSegment(segment: string): boolean {
  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true
  }
  // CUID pattern (starts with c followed by alphanumeric, 20+ chars)
  if (/^c[a-z0-9]{20,}$/i.test(segment)) {
    return true
  }
  // Generic long alphanumeric ID
  if (/^[a-z0-9]{16,}$/i.test(segment)) {
    return true
  }
  return false
}

function getSegmentLabel(segment: string): string {
  if (routeLabels[segment]) {
    return routeLabels[segment]
  }
  if (isDynamicSegment(segment)) {
    return "Details"
  }
  // Fallback: capitalize and replace hyphens
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { label: string; href: string }[] = []

  let currentPath = ""
  for (const segment of segments) {
    currentPath += `/${segment}`
    const label = getSegmentLabel(segment)
    crumbs.push({ label, href: currentPath })
  }

  return crumbs
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const breadcrumbs = buildBreadcrumbs(pathname)

  if (breadcrumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm">
      {breadcrumbs.map((crumb, index) => (
        <Fragment key={crumb.href}>
          {index > 0 && (
            <ChevronRight className="mx-2 h-3.5 w-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
          )}
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className={cn(
                "font-medium text-slate-500 dark:text-slate-400",
                "hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              )}
            >
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
