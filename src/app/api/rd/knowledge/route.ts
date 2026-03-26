import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const search = searchParams.get("search")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId: orgId, isPublished: true }
  if (category) where.category = category
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
      { tags: { contains: search } },
    ]
  }

  const articles = await prisma.knowledgeBase.findMany({
    where,
    include: {
      author: { select: { name: true, email: true } },
      project: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(articles)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string

  try {
    const body = await request.json()
    const { title, category, tags, content, projectId } = body

    if (!title || !category || !content) {
      return NextResponse.json(
        { error: "Title, category, and content are required" },
        { status: 400 }
      )
    }

    const article = await prisma.knowledgeBase.create({
      data: {
        organizationId: orgId,
        title,
        category,
        tags: tags || "",
        content,
        projectId: projectId || null,
        authorId: userId,
        isPublished: true,
      },
      include: {
        author: { select: { name: true, email: true } },
        project: { select: { name: true } },
      },
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error("Error creating knowledge article:", error)
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    )
  }
}
