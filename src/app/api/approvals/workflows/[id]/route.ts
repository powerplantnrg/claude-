import { NextResponse } from "next/server"
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

    const workflow = await prisma.approvalWorkflow.findFirst({
      where: { id, organizationId: orgId },
      include: {
        steps: {
          include: { approver: { select: { id: true, name: true, email: true } } },
          orderBy: { stepOrder: "asc" },
        },
      },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    return NextResponse.json(workflow)
  } catch (error) {
    console.error("Error fetching workflow:", error)
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

    const workflow = await prisma.approvalWorkflow.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      entityType,
      minAmount,
      maxAmount,
      requiredApprovers,
      autoApproveBelow,
      active,
      steps,
    } = body

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (entityType !== undefined) updateData.entityType = entityType
    if (minAmount !== undefined) updateData.minAmount = minAmount ? parseFloat(minAmount) : null
    if (maxAmount !== undefined) updateData.maxAmount = maxAmount ? parseFloat(maxAmount) : null
    if (requiredApprovers !== undefined) updateData.requiredApprovers = requiredApprovers
    if (autoApproveBelow !== undefined) updateData.autoApproveBelow = autoApproveBelow ? parseFloat(autoApproveBelow) : null
    if (active !== undefined) updateData.active = active

    // If steps are provided, replace all steps
    if (steps) {
      await prisma.approvalStep.deleteMany({ where: { workflowId: id } })
      updateData.steps = {
        create: steps.map(
          (step: { approverId: string; role: string; canDelegate?: boolean }, index: number) => ({
            stepOrder: index + 1,
            approverId: step.approverId,
            role: step.role || "Approver",
            canDelegate: step.canDelegate ?? false,
          })
        ),
      }
    }

    const updated = await prisma.approvalWorkflow.update({
      where: { id },
      data: updateData,
      include: {
        steps: {
          include: { approver: { select: { id: true, name: true, email: true } } },
          orderBy: { stepOrder: "asc" },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating workflow:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const workflow = await prisma.approvalWorkflow.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    // Check for pending requests using this workflow
    const pendingRequests = await prisma.approvalRequest.count({
      where: { workflowId: id, status: "Pending" },
    })

    if (pendingRequests > 0) {
      return NextResponse.json(
        { error: "Cannot delete workflow with pending approval requests" },
        { status: 400 }
      )
    }

    await prisma.approvalStep.deleteMany({ where: { workflowId: id } })
    await prisma.approvalWorkflow.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting workflow:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
