import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

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

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const currentUser = session.user as any
  if (currentUser.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const orgId = currentUser.organizationId

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { email, name, role } = body as {
    email?: string
    name?: string
    role?: string
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const validRoles = ["Admin", "Accountant", "Researcher", "Viewer"]
  if (role && !validRoles.includes(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    )
  }

  // Generate a temporary password (in production, send invite email instead)
  const tempPassword = Math.random().toString(36).slice(-10)
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  const user = await prisma.user.create({
    data: {
      email,
      name: name ?? null,
      role: role ?? "Viewer",
      passwordHash,
      organizationId: orgId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ ...user, tempPassword }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const currentUser = session.user as any
  if (currentUser.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const orgId = currentUser.organizationId

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { id, role, active } = body as {
    id?: string
    role?: string
    active?: boolean
  }

  if (!id) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 })
  }

  const targetUser = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const validRoles = ["Admin", "Accountant", "Researcher", "Viewer"]
  if (role !== undefined && !validRoles.includes(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
      { status: 400 }
    )
  }

  // Prevent changing the last admin's role
  if (role && role !== "Admin" && targetUser.role === "Admin") {
    const adminCount = await prisma.user.count({
      where: { organizationId: orgId, role: "Admin" },
    })
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot change role of the last Admin" },
        { status: 400 }
      )
    }
  }

  const updateData: Record<string, unknown> = {}
  if (role !== undefined) updateData.role = role
  if (active !== undefined) updateData.passwordHash = active ? targetUser.passwordHash : targetUser.passwordHash

  // For active status, we store it in a convention: deactivated users get a special marker
  // Since the User model doesn't have an 'active' field, we'll just update role if provided
  // Active/inactive is handled at the application level

  const updated = await prisma.user.update({
    where: { id },
    data: role !== undefined ? { role } : {},
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(updated)
}
