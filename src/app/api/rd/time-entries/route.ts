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
  const activityId = searchParams.get("activityId")
  const projectId = searchParams.get("projectId")

  if (!projectId && !activityId) {
    return NextResponse.json({ error: "projectId or activityId is required" }, { status: 400 })
  }

  const where: any = {}
  if (activityId) {
    where.rdActivityId = activityId
  }
  if (projectId) {
    where.rdActivity = { rdProjectId: projectId }
    const project = await prisma.rdProject.findFirst({
      where: { id: projectId, organizationId: orgId },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
  }

  const entries = await prisma.rdTimeEntry.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      rdActivity: true,
    },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const userId = session.user.id
  const body = await request.json()

  const { rdActivityId, date, hours, description, hourlyRate } = body

  if (!rdActivityId || !date || !hours) {
    return NextResponse.json(
      { error: "Activity ID, date, and hours are required" },
      { status: 400 }
    )
  }

  // Verify activity belongs to org
  const activity = await prisma.rdActivity.findFirst({
    where: { id: rdActivityId, rdProject: { organizationId: orgId } },
  })
  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 })
  }

  const entry = await prisma.rdTimeEntry.create({
    data: {
      userId: userId!,
      rdActivityId,
      date: new Date(date),
      hours: parseFloat(hours),
      description: description || null,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      rdActivity: true,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
