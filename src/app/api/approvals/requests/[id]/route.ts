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

    const approvalRequest = await prisma.approvalRequest.findFirst({
      where: { id, organizationId: orgId },
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
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { actionDate: "asc" },
        },
      },
    })

    if (!approvalRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    return NextResponse.json(approvalRequest)
  } catch (error) {
    console.error("Error fetching approval request:", error)
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
    const userId = (session.user as any).id
    const { id } = await params

    const approvalRequest = await prisma.approvalRequest.findFirst({
      where: { id, organizationId: orgId },
      include: {
        workflow: {
          include: {
            steps: {
              include: { approver: { select: { id: true, name: true, email: true } } },
              orderBy: { stepOrder: "asc" },
            },
          },
        },
      },
    })

    if (!approvalRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (approvalRequest.status !== "Pending") {
      return NextResponse.json(
        { error: "This request has already been resolved" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { action, comment, delegateToUserId } = body

    if (!action || !["Approve", "Reject", "Delegate"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be Approve, Reject, or Delegate" },
        { status: 400 }
      )
    }

    // Verify the current user is the approver for the current step
    const currentStepDef = approvalRequest.workflow.steps.find(
      (s) => s.stepOrder === approvalRequest.currentStep
    )

    if (!currentStepDef || currentStepDef.approverId !== userId) {
      return NextResponse.json(
        { error: "You are not the approver for the current step" },
        { status: 403 }
      )
    }

    // Handle delegation
    if (action === "Delegate") {
      if (!delegateToUserId) {
        return NextResponse.json(
          { error: "Delegate-to user ID is required for delegation" },
          { status: 400 }
        )
      }

      if (!currentStepDef.canDelegate) {
        return NextResponse.json(
          { error: "Delegation is not allowed for this step" },
          { status: 400 }
        )
      }

      // Record the delegation action
      await prisma.approvalAction.create({
        data: {
          approvalRequestId: id,
          stepOrder: approvalRequest.currentStep,
          userId,
          action: "Delegate",
          comment: comment || `Delegated to another user`,
          actionDate: new Date(),
        },
      })

      // Update the step's approver
      await prisma.approvalStep.update({
        where: { id: currentStepDef.id },
        data: { approverId: delegateToUserId },
      })

      const updated = await prisma.approvalRequest.findFirst({
        where: { id },
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
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { actionDate: "asc" },
          },
        },
      })

      return NextResponse.json(updated)
    }

    // Record the action
    await prisma.approvalAction.create({
      data: {
        approvalRequestId: id,
        stepOrder: approvalRequest.currentStep,
        userId,
        action,
        comment: comment || null,
        actionDate: new Date(),
      },
    })

    let newStatus = approvalRequest.status
    let newCurrentStep = approvalRequest.currentStep

    if (action === "Reject") {
      newStatus = "Rejected"
    } else if (action === "Approve") {
      if (approvalRequest.currentStep >= approvalRequest.totalSteps) {
        newStatus = "Approved"
      } else {
        newCurrentStep = approvalRequest.currentStep + 1
      }
    }

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: newStatus,
        currentStep: newCurrentStep,
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
        actions: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { actionDate: "asc" },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating approval request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
