import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  const grants = await prisma.grant.findMany({
    where: { organizationId: orgId },
    include: {
      milestones: { orderBy: { dueDate: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(grants)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()
  const { name, provider, status, amount, applicationDeadline, description } = body

  if (!name || !provider) {
    return NextResponse.json(
      { error: "Name and provider are required" },
      { status: 400 }
    )
  }

  const grant = await prisma.grant.create({
    data: {
      name,
      provider,
      status: status || "Discovered",
      amount: amount ? parseFloat(amount) : null,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
      description: description || null,
      organizationId: orgId,
    },
  })

  return NextResponse.json(grant, { status: 201 })
}
