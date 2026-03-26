import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")

  const where: any = {
    OR: [{ organizationId: orgId }, { organizationId: null }],
  }

  if (category) {
    where.category = category
  }

  const adviceItems = await prisma.rdAdviceItem.findMany({
    where,
    orderBy: [{ category: "asc" }, { priority: "desc" }],
  })

  return NextResponse.json(adviceItems)
}
