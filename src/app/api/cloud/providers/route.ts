import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  const providers = await prisma.cloudProvider.findMany({
    where: { organizationId: orgId },
    include: {
      _count: {
        select: { costEntries: true, computeUsage: true, tokenUsage: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(providers)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()
  const { name, displayName, enabled } = body

  if (!name || !displayName) {
    return NextResponse.json(
      { error: "Name and display name are required" },
      { status: 400 }
    )
  }

  const provider = await prisma.cloudProvider.create({
    data: {
      name,
      displayName,
      enabled: enabled !== false,
      organizationId: orgId,
    },
  })

  return NextResponse.json(provider, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()
  const { id, displayName, enabled } = body

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 })
  }

  const provider = await prisma.cloudProvider.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 })
  }

  const updated = await prisma.cloudProvider.update({
    where: { id },
    data: {
      ...(displayName !== undefined && { displayName }),
      ...(enabled !== undefined && { enabled }),
    },
  })

  return NextResponse.json(updated)
}
