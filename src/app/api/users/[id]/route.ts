import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId
  const { id } = await params

  const user = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const currentUser = session.user as any
  if (currentUser.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const orgId = currentUser.organizationId
  const { id } = await params

  const targetUser = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { role, name } = body as {
    role?: string
    name?: string
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
  if (name !== undefined) updateData.name = name

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const currentUser = session.user as any
  if (currentUser.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const orgId = currentUser.organizationId
  const { id } = await params

  // Cannot deactivate yourself
  if (id === currentUser.id) {
    return NextResponse.json(
      { error: "Cannot deactivate yourself" },
      { status: 400 }
    )
  }

  const targetUser = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Prevent deactivating the last admin
  if (targetUser.role === "Admin") {
    const adminCount = await prisma.user.count({
      where: { organizationId: orgId, role: "Admin" },
    })
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot deactivate the last Admin" },
        { status: 400 }
      )
    }
  }

  // Soft delete: set role to "Deactivated"
  const updated = await prisma.user.update({
    where: { id },
    data: { role: "Deactivated" },
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
