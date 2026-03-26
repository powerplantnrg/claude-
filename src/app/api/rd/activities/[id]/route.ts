import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = (session.user as any).organizationId
    const { id } = await params

    const activity = await prisma.rdActivity.findFirst({
      where: { id, rdProject: { organizationId: orgId } },
      include: {
        experiments: { include: { resources: true, outcomes: true } },
        timeEntries: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        evidence: true,
        _count: {
          select: { experiments: true, evidence: true, timeEntries: true },
        },
      },
    })

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error("Error fetching activity:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = (session.user as any).organizationId
    const { id } = await params

    const activity = await prisma.rdActivity.findFirst({
      where: { id, rdProject: { organizationId: orgId } },
    })

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      activityType,
      status,
      hypothesis,
      methodology,
      outcome,
      technicalUncertainty,
      newKnowledgeSought,
    } = body

    const updated = await prisma.rdActivity.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(activityType !== undefined && { activityType }),
        ...(status !== undefined && { status }),
        ...(hypothesis !== undefined && { hypothesis: hypothesis || null }),
        ...(methodology !== undefined && { methodology: methodology || null }),
        ...(outcome !== undefined && { outcome: outcome || null }),
        ...(technicalUncertainty !== undefined && {
          technicalUncertainty: technicalUncertainty || null,
        }),
        ...(newKnowledgeSought !== undefined && {
          newKnowledgeSought: newKnowledgeSought || null,
        }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating activity:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
