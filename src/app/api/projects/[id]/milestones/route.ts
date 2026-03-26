import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const project = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: id },
      orderBy: { dueDate: "asc" },
    })

    return NextResponse.json(milestones)
  } catch (error) {
    console.error("Error fetching milestones:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const project = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, description, amount, dueDate } = body

    if (!name) {
      return NextResponse.json(
        { error: "Milestone name is required" },
        { status: 400 }
      )
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: id,
        name,
        description: description || null,
        amount: amount ? parseFloat(amount) : undefined,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "Pending",
      },
    })

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    console.error("Error creating milestone:", error)
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const project = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { milestoneId, name, description, amount, dueDate, status, invoiceId } = body

    if (!milestoneId) {
      return NextResponse.json(
        { error: "Milestone ID is required" },
        { status: 400 }
      )
    }

    const existing = await prisma.projectMilestone.findFirst({
      where: { id: milestoneId, projectId: id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      )
    }

    const data: any = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description
    if (amount !== undefined) data.amount = amount ? parseFloat(amount) : null
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (status !== undefined) data.status = status
    if (invoiceId !== undefined) data.invoiceId = invoiceId || null

    const milestone = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data,
    })

    return NextResponse.json(milestone)
  } catch (error) {
    console.error("Error updating milestone:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
