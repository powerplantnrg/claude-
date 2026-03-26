import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get("search")
  const entityType = searchParams.get("entityType")
  const entityId = searchParams.get("entityId")
  const tags = searchParams.get("tags")

  const where: Record<string, unknown> = { organizationId: orgId }

  if (entityType) {
    const validTypes = [
      "Invoice",
      "Bill",
      "Expense",
      "Contact",
      "Project",
      "Asset",
      "Employee",
      "General",
    ]
    if (validTypes.includes(entityType)) {
      where.entityType = entityType
    }
  }

  if (entityId) {
    where.entityId = entityId
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { fileName: { contains: search } },
      { tags: { contains: search } },
    ]
  }

  if (tags) {
    where.tags = { contains: tags }
  }

  const documents = await prisma.document.findMany({
    where,
    include: {
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(documents)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId
  const userId = session.user!.id

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    name,
    fileName,
    fileSize,
    mimeType,
    storageKey,
    entityType,
    entityId,
    description,
    tags,
  } = body as {
    name?: string
    fileName?: string
    fileSize?: number
    mimeType?: string
    storageKey?: string
    entityType?: string
    entityId?: string
    description?: string
    tags?: string
  }

  if (!name || !fileName || !storageKey) {
    return NextResponse.json(
      { error: "Fields 'name', 'fileName', and 'storageKey' are required" },
      { status: 400 }
    )
  }

  const validEntityTypes = [
    "Invoice",
    "Bill",
    "Expense",
    "Contact",
    "Project",
    "Asset",
    "Employee",
    "General",
  ]
  const resolvedEntityType = entityType ?? "General"
  if (!validEntityTypes.includes(resolvedEntityType)) {
    return NextResponse.json(
      {
        error: `Invalid entityType. Must be one of: ${validEntityTypes.join(", ")}`,
      },
      { status: 400 }
    )
  }

  const document = await prisma.document.create({
    data: {
      name,
      fileName,
      fileSize: fileSize ?? 0,
      mimeType: mimeType ?? "application/octet-stream",
      storageKey,
      entityType: resolvedEntityType,
      entityId: entityId ?? null,
      description: description ?? null,
      tags: tags ?? null,
      uploadedById: userId,
      organizationId: orgId,
    },
    include: {
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return NextResponse.json(document, { status: 201 })
}
