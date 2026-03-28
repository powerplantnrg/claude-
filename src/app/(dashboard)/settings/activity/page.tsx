import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import {
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Eye,
  FileDown,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ACTION_ICONS: Record<string, { icon: typeof Plus; color: string; bg: string }> = {
  CREATE: { icon: Plus, color: "text-green-600", bg: "bg-green-100" },
  UPDATE: { icon: Pencil, color: "text-blue-600", bg: "bg-blue-100" },
  DELETE: { icon: Trash2, color: "text-red-600", bg: "bg-red-100" },
  LOGIN: { icon: LogIn, color: "text-amber-600", bg: "bg-amber-100" },
  LOGOUT: { icon: LogOut, color: "text-slate-600", bg: "bg-slate-100" },
  VIEW: { icon: Eye, color: "text-purple-600", bg: "bg-purple-100" },
  EXPORT: { icon: FileDown, color: "text-cyan-600", bg: "bg-cyan-100" },
}

function getEntityLink(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null
  const routes: Record<string, string> = {
    Invoice: `/invoices/${entityId}`,
    Contact: `/contacts/${entityId}`,
    RdProject: `/rd/projects/${entityId}`,
    Grant: `/grants/${entityId}`,
    Account: `/accounts`,
  }
  return routes[entityType] ?? null
}

function formatActionText(action: string, entityType: string, entityId: string | null): string {
  const actionVerbs: Record<string, string> = {
    CREATE: "created",
    UPDATE: "updated",
    DELETE: "deleted",
    LOGIN: "logged in",
    LOGOUT: "logged out",
    VIEW: "viewed",
    EXPORT: "exported",
  }
  const verb = actionVerbs[action] ?? action.toLowerCase()

  if (action === "LOGIN" || action === "LOGOUT") {
    return verb
  }

  const typeLabel = entityType
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase()

  return `${verb} a ${typeLabel}${entityId ? ` (${entityId.slice(0, 8)}...)` : ""}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatGroupDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"

  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default async function ActivityPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { timestamp: "desc" },
    take: 100,
  })

  // Group by date
  const grouped: Record<string, typeof logs> = {}
  for (const log of logs) {
    const dateKey = log.timestamp.toISOString().split("T")[0]
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(log)
  }

  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/settings" className="hover:text-slate-700">
            Settings
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900">Activity</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Activity Feed</h1>
        <p className="mt-1 text-sm text-slate-500">
          Recent activity across your organization
        </p>
      </div>

      {dateKeys.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Activity className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {dateKeys.map((dateKey) => (
            <div key={dateKey}>
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                {formatGroupDate(dateKey)}
              </h3>
              <div className="relative ml-4 border-l-2 border-slate-200 pl-6 space-y-4">
                {grouped[dateKey].map((log) => {
                  const actionConfig = ACTION_ICONS[log.action] ?? {
                    icon: Activity,
                    color: "text-slate-600",
                    bg: "bg-slate-100",
                  }
                  const Icon = actionConfig.icon
                  const entityLink = getEntityLink(log.entityType, log.entityId)

                  return (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          "absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full",
                          actionConfig.bg
                        )}
                      >
                        <Icon className={cn("h-3 w-3", actionConfig.color)} />
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm hover:border-slate-200 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm text-slate-900">
                              <span className="font-medium">
                                {log.user?.name || log.user?.email || "System"}
                              </span>{" "}
                              {formatActionText(log.action, log.entityType, log.entityId)}
                            </p>
                            {log.details && (
                              <p className="mt-0.5 text-xs text-slate-500 truncate max-w-lg">
                                {log.details.length > 120
                                  ? log.details.slice(0, 120) + "..."
                                  : log.details}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {entityLink && (
                              <Link
                                href={entityLink}
                                className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                              >
                                View
                              </Link>
                            )}
                            <span className="text-xs text-slate-400 whitespace-nowrap">
                              {formatTime(log.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
