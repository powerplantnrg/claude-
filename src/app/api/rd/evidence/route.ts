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

  const evidence = await prisma.rdEvidence.findMany({
    where,
    include: { rdActivity: true },
    orderBy: { uploadedAt: "desc" },
  })

  return NextResponse.json(evidence)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()

  const { rdActivityId, fileName, fileType, filePath, fileSize, description, category } = body

  if (!rdActivityId || !fileName || !fileType || !filePath) {
    return NextResponse.json(
      { error: "Activity ID, file name, file type, and file path are required" },
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

  const evidence = await prisma.rdEvidence.create({
    data: {
      rdActivityId,
      fileName,
      fileType,
      filePath,
      fileSize: fileSize || null,
      description: description || null,
      category: category || "Other",
    },
  })

  return NextResponse.json(evidence, { status: 201 })
}
