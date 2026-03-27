"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Users,
  BookOpen,
  FileText,
  FlaskConical,
  Cloud,
  Landmark,
  DollarSign,
  CheckSquare,
  ShoppingCart,
  Database,
} from "lucide-react"

interface OnboardingItem {
  key: string
  label: string
  completed: boolean
  link: string
}

interface OnboardingData {
  items: OnboardingItem[]
  progress: number
  completedCount: number
  totalCount: number
}

const iconMap: Record<string, React.ReactNode> = {
  orgDetails: <Building2 className="h-4 w-4" />,
  contacts: <Users className="h-4 w-4" />,
  accounts: <BookOpen className="h-4 w-4" />,
  invoices: <FileText className="h-4 w-4" />,
  rdProjects: <FlaskConical className="h-4 w-4" />,
  cloudProviders: <Cloud className="h-4 w-4" />,
  bankTransactions: <Landmark className="h-4 w-4" />,
  payroll: <DollarSign className="h-4 w-4" />,
  approvals: <CheckSquare className="h-4 w-4" />,
  marketplace: <ShoppingCart className="h-4 w-4" />,
  migration: <Database className="h-4 w-4" />,
}

export function OnboardingChecklist() {
  const [data, setData] = useState<OnboardingData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("onboarding-dismissed")
      if (stored === "true") {
        setDismissed(true)
      }
    }
  }, [])

  useEffect(() => {
    if (dismissed) return
    async function fetchData() {
      try {
        const res = await fetch("/api/onboarding")
        if (res.ok) {
          const result = await res.json()
          setData(result)
        }
      } catch {
        // ignore
      }
    }
    fetchData()
  }, [dismissed])

  if (dismissed || !data || data.progress >= 100) return null

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem("onboarding-dismissed", "true")
  }

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
            <FlaskConical className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Get started with your workspace
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {data.completedCount} of {data.totalCount} steps completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
            aria-label="Dismiss onboarding checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 sm:px-6 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${data.progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
            {data.progress}%
          </span>
        </div>
      </div>

      {/* Checklist items */}
      {expanded && (
        <div className="px-4 sm:px-6 pb-4 space-y-1">
          {data.items.map((item) => (
            <Link
              key={item.key}
              href={item.link}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                item.completed
                  ? "text-slate-400 dark:text-slate-500"
                  : "text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/40"
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
              )}
              <span className="flex items-center gap-2">
                {iconMap[item.key]}
                <span className={item.completed ? "line-through" : ""}>
                  {item.label}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
