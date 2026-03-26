import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") // "pending", "my-requests", or "all"

    let where: any = { organizationId: orgId }

    if (filter === "pending") {
      // Requests awaiting this user's approval at the current step
      where = {
        organizationId: orgId,
        status: "Pending",
        workflow: {
          steps: {
            some: {
              approverId: userId,
            },
          },
        },
      }
    } else if (filter === "my-requests") {
      where = {
        organizationId: orgId,
        requestedById: userId,
      }
    }

    const requests = await prisma.approvalRequest.findMany({
      where,
      include: {
        workflow: {
          include: {
            steps: {
              include: { approver: { select: { id: true, name: true, email: true } } },
              orderBy: { stepOrder: "asc" },
            },
          },
        },
        requestedBy: { select: { id: true, name: true, email: true } },
        actions: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { actionDate: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // For pending filter, further filter to only show requests at a step where this user is the approver
    let filtered = requests
    if (filter === "pending") {
      filtered = requests.filter((req) => {
        const currentStepDef = req.workflow.steps.find(
          (s) => s.stepOrder === req.currentStep
        )
        return currentStepDef?.approverId === userId
      })
    }

    return NextResponse.json(filtered)
  } catch (error) {
    console.error("Error fetching approval requests:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id

    const body = await request.json()
    const { workflowId, entityType, entityId, notes } = body

    if (!workflowId || !entityType || !entityId) {
      return NextResponse.json(
        { error: "Workflow ID, entity type, and entity ID are required" },
        { status: 400 }
      )
    }

    const workflow = await prisma.approvalWorkflow.findFirst({
      where: { id: workflowId, organizationId: orgId, active: true },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found or inactive" },
        { status: 404 }
      )
    }

    const totalSteps = workflow.steps.length

    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        organizationId: orgId,
        workflowId,
        entityType,
        entityId,
        requestedById: userId,
        currentStep: 1,
        status: "Pending",
        totalSteps,
        notes: notes || null,
      },
      include: {
        workflow: {
          include: {
            steps: {
              include: { approver: { select: { id: true, name: true, email: true } } },
              orderBy: { stepOrder: "asc" },
            },
          },
        },
        requestedBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(approvalRequest, { status: 201 })
  } catch (error) {
    console.error("Error creating approval request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
