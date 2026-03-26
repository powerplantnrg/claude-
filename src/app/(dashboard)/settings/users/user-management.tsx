"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  UserPlus,
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  MoreVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"

type User = {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  updatedAt: string
}

const ROLES = ["Admin", "Accountant", "Researcher", "Viewer"] as const

const ROLE_COLORS: Record<string, string> = {
  Admin: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Accountant: "bg-blue-50 text-blue-700 border-blue-200",
  Researcher: "bg-green-50 text-green-700 border-green-200",
  Viewer: "bg-slate-100 text-slate-600 border-slate-200",
  Deactivated: "bg-red-50 text-red-600 border-red-200",
}

export function UserManagement({
  users: initialUsers,
  currentUserId,
}: {
  users: User[]
  currentUserId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [users, setUsers] = useState(initialUsers)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [actionMenu, setActionMenu] = useState<string | null>(null)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteRole, setInviteRole] = useState<string>("Viewer")
  const [inviteResult, setInviteResult] = useState<{ tempPassword?: string } | null>(null)

  const adminCount = users.filter((u) => u.role === "Admin").length

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setInviteResult(null)

    startTransition(async () => {
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail,
            name: inviteName || null,
            role: inviteRole,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setInviteResult({ tempPassword: data.tempPassword })
          setUsers((prev) => [...prev, data])
          setMessage({ type: "success", text: "User invited successfully" })
          router.refresh()
        } else {
          const data = await res.json()
          setMessage({ type: "error", text: data.error || "Failed to invite user" })
        }
      } catch {
        setMessage({ type: "error", text: "An error occurred" })
      }
    })
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setMessage(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        })

        if (res.ok) {
          const updated = await res.json()
          setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)))
          setEditingRole(null)
          setMessage({ type: "success", text: "Role updated" })
          router.refresh()
        } else {
          const data = await res.json()
          setMessage({ type: "error", text: data.error || "Failed to update role" })
        }
      } catch {
        setMessage({ type: "error", text: "An error occurred" })
      }
    })
  }

  async function handleToggleActive(userId: string, currentRole: string) {
    setMessage(null)
    const isDeactivated = currentRole === "Deactivated"

    startTransition(async () => {
      try {
        if (isDeactivated) {
          // Reactivate: set role to Viewer
          const res = await fetch(`/api/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "Viewer" }),
          })
          if (res.ok) {
            const updated = await res.json()
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)))
            setMessage({ type: "success", text: "User reactivated" })
            router.refresh()
          } else {
            const data = await res.json()
            setMessage({ type: "error", text: data.error || "Failed to reactivate user" })
          }
        } else {
          // Deactivate
          const res = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
          })
          if (res.ok) {
            const updated = await res.json()
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)))
            setMessage({ type: "success", text: "User deactivated" })
            router.refresh()
          } else {
            const data = await res.json()
            setMessage({ type: "error", text: data.error || "Failed to deactivate user" })
          }
        }
      } catch {
        setMessage({ type: "error", text: "An error occurred" })
      }
    })
    setActionMenu(null)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  function closeInviteModal() {
    setShowInviteModal(false)
    setInviteEmail("")
    setInviteName("")
    setInviteRole("Viewer")
    setInviteResult(null)
    setMessage(null)
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm font-medium",
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Users table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 font-medium text-slate-600">Email</th>
                <th className="px-4 py-3 font-medium text-slate-600">Role</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600">Created</th>
                <th className="px-4 py-3 font-medium text-slate-600 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const isSelf = user.id === currentUserId
                const isDeactivated = user.role === "Deactivated"
                const isLastAdmin = user.role === "Admin" && adminCount <= 1

                return (
                  <tr
                    key={user.id}
                    className={cn(
                      "transition-colors",
                      isDeactivated ? "bg-slate-50 opacity-60" : "hover:bg-slate-50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">
                          {user.name || "-"}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-slate-400">(you)</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      {editingRole === user.id && !isDeactivated ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          onBlur={() => setEditingRole(null)}
                          autoFocus
                          disabled={isPending}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        >
                          {ROLES.map((r) => (
                            <option
                              key={r}
                              value={r}
                              disabled={
                                isLastAdmin && user.role === "Admin" && r !== "Admin"
                              }
                            >
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => {
                            if (!isDeactivated && !isSelf) setEditingRole(user.id)
                          }}
                          disabled={isDeactivated || isSelf}
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            ROLE_COLORS[user.role] || ROLE_COLORS.Viewer,
                            !isDeactivated && !isSelf && "cursor-pointer hover:opacity-80"
                          )}
                        >
                          {user.role}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium",
                          isDeactivated ? "text-red-600" : "text-green-600"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            isDeactivated ? "bg-red-500" : "bg-green-500"
                          )}
                        />
                        {isDeactivated ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 relative">
                      {!isSelf && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActionMenu(actionMenu === user.id ? null : user.id)
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {actionMenu === user.id && (
                            <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                              <button
                                onClick={() => handleToggleActive(user.id, user.role)}
                                disabled={isPending}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                {isDeactivated ? (
                                  <>
                                    <ShieldCheck className="h-4 w-4 text-green-600" />
                                    Reactivate User
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert className="h-4 w-4 text-red-600" />
                                    Deactivate User
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeInviteModal} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Invite User</h3>
              <button
                onClick={closeInviteModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {inviteResult?.tempPassword ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">User invited successfully!</p>
                  <p className="mt-2 text-sm text-green-700">
                    Temporary password:
                  </p>
                  <code className="mt-1 block rounded bg-white px-3 py-2 text-sm font-mono text-slate-900 border border-green-200">
                    {inviteResult.tempPassword}
                  </code>
                  <p className="mt-2 text-xs text-green-600">
                    Share this password with the user. They should change it upon first login.
                  </p>
                </div>
                <button
                  onClick={closeInviteModal}
                  className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {message && (
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      message.type === "error"
                        ? "bg-red-50 text-red-700"
                        : "bg-green-50 text-green-700"
                    )}
                  >
                    {message.text}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isPending ? "Inviting..." : "Send Invite"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
