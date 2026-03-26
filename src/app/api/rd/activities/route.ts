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
  const projectId = searchParams.get("projectId")

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  // Verify project belongs to org
  const project = await prisma.rdProject.findFirst({
    where: { id: projectId, organizationId: orgId },
  })
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const activities = await prisma.rdActivity.findMany({
    where: { rdProjectId: projectId },
    include: {
      _count: {
        select: { experiments: true, evidence: true, timeEntries: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(activities)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()

  const { rdProjectId, name, activityType, hypothesis, methodology, technicalUncertainty, newKnowledgeSought } = body

  if (!rdProjectId || !name) {
    return NextResponse.json({ error: "Project ID and name are required" }, { status: 400 })
  }

  // Verify project belongs to org
  const project = await prisma.rdProject.findFirst({
    where: { id: rdProjectId, organizationId: orgId },
  })
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const activity = await prisma.rdActivity.create({
    data: {
      rdProjectId,
      name,
      activityType: activityType || "Core",
      hypothesis: hypothesis || null,
      methodology: methodology || null,
      technicalUncertainty: technicalUncertainty || null,
      newKnowledgeSought: newKnowledgeSought || null,
    },
  })

  return NextResponse.json(activity, { status: 201 })
}
