import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()

  const { grantId, title, dueDate, spendToDate, evidence } = body

  if (!grantId || !title) {
    return NextResponse.json(
      { error: "Grant ID and title are required" },
      { status: 400 }
    )
  }

  // Verify grant belongs to org
  const grant = await prisma.grant.findUnique({
    where: { id: grantId },
  })

  if (!grant || grant.organizationId !== orgId) {
    return NextResponse.json({ error: "Grant not found" }, { status: 404 })
  }

  const milestone = await prisma.grantMilestone.create({
    data: {
      grantId,
      title,
      dueDate: dueDate ? new Date(dueDate) : null,
      spendToDate: spendToDate ? parseFloat(spendToDate) : null,
      evidence: evidence || null,
    },
  })

  return NextResponse.json(milestone, { status: 201 })
}
