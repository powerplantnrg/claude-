import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  const favorites = await prisma.userFavorite.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  })

  return NextResponse.json(favorites)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  const body = await request.json()
  const { label, path, icon } = body

  if (!label || !path) {
    return NextResponse.json({ error: "label and path are required" }, { status: 400 })
  }

  // Get the max order for this user
  const maxOrder = await prisma.userFavorite.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  })

  const favorite = await prisma.userFavorite.create({
    data: {
      userId,
      label,
      path,
      icon: icon || null,
      order: (maxOrder?.order ?? -1) + 1,
    },
  })

  return NextResponse.json(favorite, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  const { searchParams } = request.nextUrl
  const path = searchParams.get("path")

  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 })
  }

  await prisma.userFavorite.deleteMany({
    where: { userId, path },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  const body = await request.json()
  const { orderedIds } = body as { orderedIds: string[] }

  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "orderedIds array is required" }, { status: 400 })
  }

  // Update order for each favorite
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.userFavorite.updateMany({
        where: { id, userId },
        data: { order: index },
      })
    )
  )

  return NextResponse.json({ success: true })
}
