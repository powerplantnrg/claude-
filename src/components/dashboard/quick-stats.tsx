"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { FileText, Receipt, ArrowRightLeft, FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickStatsData {
  invoicesDueThisWeek: number
  billsDueThisWeek: number
  unreconciledTransactions: number
  openExperiments: number
}

export function QuickStats() {
  const [stats, setStats] = useState<QuickStatsData | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/quick-stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60_000)
    return () => clearInterval(interval)
  }, [fetchStats])

  if (!stats) return null

  const items = [
    {
      label: "Invoices Due This Week",
      value: stats.invoicesDueThisWeek,
      href: "/invoices",
      icon: <FileText className="h-4 w-4" />,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/30",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      label: "Bills Due This Week",
      value: stats.billsDueThisWeek,
      href: "/bills",
      icon: <Receipt className="h-4 w-4" />,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/30",
      gradient: "from-rose-500 to-pink-500",
    },
    {
      label: "Unreconciled Transactions",
      value: stats.unreconciledTransactions,
      href: "/banking",
      icon: <ArrowRightLeft className="h-4 w-4" />,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/30",
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      label: "Open Experiments",
      value: stats.openExperiments,
      href: "/rd/experiments",
      icon: <FlaskConical className="h-4 w-4" />,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-900/30",
      gradient: "from-violet-500 to-purple-500",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5",
            "border-slate-200/80 dark:border-slate-700/50",
            "bg-white dark:bg-slate-900",
            "transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
          )}
        >
          {/* Accent dot */}
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
            item.bg, item.color
          )}>
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className={cn("text-xl font-bold tabular-nums", item.color)}>{item.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.label}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
