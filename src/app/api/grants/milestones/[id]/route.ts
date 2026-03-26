import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const { id } = await params
  const body = await request.json()

  const milestone = await prisma.grantMilestone.findUnique({
    where: { id },
    include: { grant: true },
  })

  if (!milestone || milestone.grant.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.grantMilestone.update({
    where: { id },
    data: {
      ...(body.completed !== undefined && { completed: body.completed }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.spendToDate !== undefined && {
        spendToDate: body.spendToDate ? parseFloat(body.spendToDate) : null,
      }),
      ...(body.evidence !== undefined && { evidence: body.evidence }),
    },
  })

  return NextResponse.json(updated)
}
