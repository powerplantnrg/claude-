import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  const tags = await prisma.contactTag.findMany({
    where: { organizationId: orgId },
    include: {
      contacts: {
        include: { contact: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(tags)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  const body = await request.json()
  const { name, color, contactIds } = body as {
    name?: string
    color?: string
    contactIds?: string[]
  }

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const tag = await prisma.contactTag.create({
    data: {
      organizationId: orgId,
      name: name.trim(),
      color: color || "#6366f1",
      ...(contactIds && contactIds.length > 0
        ? {
            contacts: {
              create: contactIds.map((contactId: string) => ({ contactId })),
            },
          }
        : {}),
    },
    include: {
      contacts: {
        include: { contact: { select: { id: true, name: true } } },
      },
    },
  })

  return NextResponse.json(tag, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  const { searchParams } = request.nextUrl
  const tagId = searchParams.get("id")

  if (!tagId) {
    return NextResponse.json({ error: "Tag ID is required" }, { status: 400 })
  }

  // Verify tag belongs to org
  const tag = await prisma.contactTag.findFirst({
    where: { id: tagId, organizationId: orgId },
  })

  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 })
  }

  // Delete assignments first, then the tag
  await prisma.contactTagAssignment.deleteMany({
    where: { tagId },
  })

  await prisma.contactTag.delete({
    where: { id: tagId },
  })

  return NextResponse.json({ success: true })
}
