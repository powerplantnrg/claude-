"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Bell, AlertTriangle, FileWarning, DollarSign, Calendar, CheckSquare, ShoppingCart, Milestone, PlaneTakeoff, Database, Package, Clock, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type:
    | "overdue_invoice"
    | "compliance_warning"
    | "budget_alert"
    | "grant_deadline"
    | "pending_approval"
    | "marketplace_bid"
    | "contract_milestone"
    | "leave_request"
    | "migration_review"
    | "inventory_reorder"
    | "time_entry_approval"
    | "payroll_due"
  title: string
  message: string
  severity: "info" | "warning" | "critical"
  link: string
  createdAt: string
}

const typeIcons: Record<string, React.ElementType> = {
  overdue_invoice: FileWarning,
  compliance_warning: AlertTriangle,
  budget_alert: DollarSign,
  grant_deadline: Calendar,
  pending_approval: CheckSquare,
  marketplace_bid: ShoppingCart,
  contract_milestone: Milestone,
  leave_request: PlaneTakeoff,
  migration_review: Database,
  inventory_reorder: Package,
  time_entry_approval: Clock,
  payroll_due: Wallet,
}

const severityStyles: Record<string, { dot: string; bg: string }> = {
  critical: { dot: "bg-red-500", bg: "bg-red-50" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-50" },
  info: { dot: "bg-blue-500", bg: "bg-blue-50" },
}

export function Notifications() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setCount(data.count)
      }
    } catch {
      // Silently fail - notifications are non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) fetchNotifications()
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
            aria-live="polite"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-xl border border-slate-200 bg-white shadow-lg z-50" role="menu" aria-label="Notifications list">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Notifications
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {count}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  No notifications
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notif) => {
                  const Icon = typeIcons[notif.type] || Bell
                  const styles = severityStyles[notif.severity]
                  return (
                    <li key={notif.id}>
                      <a
                        href={notif.link}
                        className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            styles.bg
                          )}
                        >
                          <Icon
                            className={cn("h-4 w-4", {
                              "text-red-600": notif.severity === "critical",
                              "text-amber-600": notif.severity === "warning",
                              "text-blue-600": notif.severity === "info",
                            })}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {notif.title}
                            </p>
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                styles.dot
                              )}
                            />
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                            {notif.message}
                          </p>
                        </div>
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
