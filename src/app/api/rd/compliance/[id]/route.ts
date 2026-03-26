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

  const item = await prisma.rdComplianceChecklist.findUnique({
    where: { id },
    include: { rdProject: true },
  })

  if (!item || item.rdProject.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.rdComplianceChecklist.update({
    where: { id },
    data: {
      completed: body.completed ?? item.completed,
      notes: body.notes !== undefined ? body.notes : item.notes,
    },
  })

  return NextResponse.json(updated)
}
