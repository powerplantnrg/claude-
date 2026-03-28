import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)))
  const userId = searchParams.get("userId")
  const action = searchParams.get("action")
  const entityType = searchParams.get("entityType")
  const entityId = searchParams.get("entityId")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  const where: Record<string, unknown> = { organizationId: orgId }

  if (userId) where.userId = userId
  if (action) where.action = action
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = { contains: entityId }

  if (dateFrom || dateTo) {
    const timestampFilter: Record<string, Date> = {}
    if (dateFrom) timestampFilter.gte = new Date(dateFrom)
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      timestampFilter.lte = to
    }
    where.timestamp = timestampFilter
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({
    data,
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}
