import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const orgId = (session.user as Record<string, unknown>).organizationId as string

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get("entityType")
  const entityId = searchParams.get("entityId")
  const limit = parseInt(searchParams.get("limit") || "100")

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: orgId,
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { timestamp: "desc" },
    take: limit,
  })

  return NextResponse.json(logs)
}
