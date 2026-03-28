import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { UserManagement } from "./user-management"

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const currentUser = session.user as any
  const orgId = currentUser.organizationId as string

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  const serializedUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/settings" className="hover:text-slate-700">
            Settings
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900">Users</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage team members, roles, and access for your organization
        </p>
      </div>

      <UserManagement users={serializedUsers} currentUserId={currentUser.id} />
    </div>
  )
}
