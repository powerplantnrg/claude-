import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  const stages = await prisma.rdPipelineStage.findMany({
    where: { organizationId: orgId },
    include: {
      experiments: {
        include: {
          rdActivity: {
            include: {
              rdProject: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { stageOrder: "asc" },
  })

  return NextResponse.json(stages)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()
  const { name, stageOrder, description } = body

  if (!name || stageOrder === undefined) {
    return NextResponse.json(
      { error: "Name and stageOrder are required" },
      { status: 400 }
    )
  }

  const stage = await prisma.rdPipelineStage.create({
    data: {
      name,
      stageOrder: parseInt(stageOrder),
      description: description || null,
      organizationId: orgId,
    },
  })

  return NextResponse.json(stage, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()
  const { experimentId, pipelineStageId } = body

  if (!experimentId) {
    return NextResponse.json(
      { error: "Experiment ID is required" },
      { status: 400 }
    )
  }

  // Verify experiment belongs to org
  const experiment = await prisma.experiment.findFirst({
    where: {
      id: experimentId,
      rdActivity: { rdProject: { organizationId: orgId } },
    },
  })

  if (!experiment) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 })
  }

  const updated = await prisma.experiment.update({
    where: { id: experimentId },
    data: { pipelineStageId: pipelineStageId || null },
  })

  return NextResponse.json(updated)
}
