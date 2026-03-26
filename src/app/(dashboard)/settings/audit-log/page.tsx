import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { AuditLogTable } from "./audit-log-table"

export default async function AuditLogPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/settings" className="hover:text-slate-700">
            Settings
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900">Audit Log</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          View all system activity and changes across your organization
        </p>
      </div>

      <AuditLogTable users={users} />
    </div>
  )
}
