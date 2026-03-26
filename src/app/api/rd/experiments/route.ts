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

  // Build where clause
  const where: any = {}
  if (activityId) {
    where.rdActivityId = activityId
  }
  if (projectId) {
    where.rdActivity = { rdProjectId: projectId }
    // Verify project belongs to org
    const project = await prisma.rdProject.findFirst({
      where: { id: projectId, organizationId: orgId },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
  }

  const experiments = await prisma.experiment.findMany({
    where,
    include: {
      rdActivity: true,
      resources: true,
      outcomes: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(experiments)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()

  const { rdActivityId, name, hypothesis, startDate, endDate, iterationNumber } = body

  if (!rdActivityId || !name) {
    return NextResponse.json({ error: "Activity ID and name are required" }, { status: 400 })
  }

  // Verify activity belongs to org project
  const activity = await prisma.rdActivity.findFirst({
    where: { id: rdActivityId, rdProject: { organizationId: orgId } },
  })
  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 })
  }

  const experiment = await prisma.experiment.create({
    data: {
      rdActivityId,
      name,
      hypothesis: hypothesis || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      iterationNumber: iterationNumber || 1,
    },
    include: {
      rdActivity: true,
      resources: true,
    },
  })

  return NextResponse.json(experiment, { status: 201 })
}
