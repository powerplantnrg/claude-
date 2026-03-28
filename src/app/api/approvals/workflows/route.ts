import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const workflows = await prisma.approvalWorkflow.findMany({
      where: { organizationId: orgId },
      include: {
        steps: {
          include: { approver: { select: { id: true, name: true, email: true } } },
          orderBy: { stepOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(workflows)
  } catch (error) {
    console.error("Error fetching approval workflows:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const {
      name,
      entityType,
      minAmount,
      maxAmount,
      requiredApprovers,
      autoApproveBelow,
      steps,
    } = body

    if (!name || !entityType) {
      return NextResponse.json(
        { error: "Name and entity type are required" },
        { status: 400 }
      )
    }

    if (!steps || steps.length === 0) {
      return NextResponse.json(
        { error: "At least one approval step is required" },
        { status: 400 }
      )
    }

    const workflow = await prisma.approvalWorkflow.create({
      data: {
        organizationId: orgId,
        name,
        entityType,
        minAmount: minAmount ? parseFloat(minAmount) : null,
        maxAmount: maxAmount ? parseFloat(maxAmount) : null,
        requiredApprovers: requiredApprovers || steps.length,
        autoApproveBelow: autoApproveBelow ? parseFloat(autoApproveBelow) : null,
        active: true,
        steps: {
          create: steps.map(
            (step: { approverId: string; role: string; canDelegate?: boolean }, index: number) => ({
              stepOrder: index + 1,
              approverId: step.approverId,
              role: step.role || "Approver",
              canDelegate: step.canDelegate ?? false,
            })
          ),
        },
      },
      include: {
        steps: {
          include: { approver: { select: { id: true, name: true, email: true } } },
          orderBy: { stepOrder: "asc" },
        },
      },
    })

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    console.error("Error creating approval workflow:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
