import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const deadline = await prisma.complianceDeadline.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!deadline) {
      return NextResponse.json({ error: "Deadline not found" }, { status: 404 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.status !== undefined) updateData.status = body.status
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate)
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.reminderDays !== undefined) updateData.reminderDays = body.reminderDays

    // Mark as completed
    if (body.status === "Completed") {
      updateData.completedAt = new Date()
      updateData.completedById = (session.user as any).id
    }

    const updated = await prisma.complianceDeadline.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating compliance deadline:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
