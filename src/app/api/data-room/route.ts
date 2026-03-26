import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string

  const tokens = await prisma.dataRoomToken.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(tokens)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const body = await request.json()
  const { name, expiresAt } = body

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const token = await prisma.dataRoomToken.create({
    data: {
      name,
      token: randomUUID(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      organizationId: orgId,
    },
  })

  return NextResponse.json(token, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const body = await request.json()
  const { id, isActive, expiresAt } = body

  if (!id) {
    return NextResponse.json({ error: "Token ID is required" }, { status: 400 })
  }

  const existing = await prisma.dataRoomToken.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 })
  }

  const updated = await prisma.dataRoomToken.update({
    where: { id },
    data: {
      ...(typeof isActive === "boolean" ? { isActive } : {}),
      ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Token ID is required" }, { status: 400 })
  }

  const existing = await prisma.dataRoomToken.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 })
  }

  await prisma.dataRoomToken.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
