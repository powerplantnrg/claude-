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

    const experiment = await prisma.experiment.findFirst({
      where: {
        id,
        rdActivity: { rdProject: { organizationId: orgId } },
      },
      include: {
        rdActivity: {
          include: {
            rdProject: { select: { id: true, name: true } },
          },
        },
        resources: true,
        outcomes: { orderBy: { recordedAt: "desc" } },
      },
    })

    if (!experiment) {
      return NextResponse.json(
        { error: "Experiment not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(experiment)
  } catch (error) {
    console.error("Error fetching experiment:", error)
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

    const experiment = await prisma.experiment.findFirst({
      where: {
        id,
        rdActivity: { rdProject: { organizationId: orgId } },
      },
    })

    if (!experiment) {
      return NextResponse.json(
        { error: "Experiment not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      hypothesis,
      status,
      outcome,
      iterationNumber,
      startDate,
      endDate,
    } = body

    const updated = await prisma.experiment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(hypothesis !== undefined && {
          hypothesis: hypothesis || null,
        }),
        ...(status !== undefined && { status }),
        ...(outcome !== undefined && { outcome: outcome || null }),
        ...(iterationNumber !== undefined && {
          iterationNumber: parseInt(iterationNumber) || 1,
        }),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
      },
      include: {
        rdActivity: true,
        resources: true,
        outcomes: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating experiment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
