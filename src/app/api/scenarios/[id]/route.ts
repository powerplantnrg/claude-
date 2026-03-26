import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const scenario = await prisma.scenario.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!scenario) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(scenario)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const existing = await prisma.scenario.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.scenario.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
