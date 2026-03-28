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
    const userId = (session.user as any).id as string
    const { id } = await params

    const existing = await prisma.taxMinimisationStrategy.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Tax strategy not found" }, { status: 404 })
    }

    const body = await request.json()
    const { implemented, estimatedSaving, description, notes, implementedDate } = body

    const updateData: any = {}
    if (implemented !== undefined) updateData.implemented = implemented
    if (estimatedSaving !== undefined) updateData.estimatedSaving = estimatedSaving
    if (description) updateData.description = description
    if (notes) updateData.notes = notes

    // If marking as implemented, set the implementation date
    if (implemented === true) {
      updateData.implementedDate = implementedDate ? new Date(implementedDate) : new Date()
    }

    const updated = await prisma.taxMinimisationStrategy.update({
      where: { id },
      data: updateData,
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Update",
        entityType: "TaxMinimisationStrategy",
        entityId: id,
        details: `Updated tax strategy "${existing.category}" - ${existing.title}${implemented !== undefined ? ` - implemented: ${implemented}` : ""}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating tax strategy:", error)
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id as string
    const { id } = await params

    const existing = await prisma.taxMinimisationStrategy.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Tax strategy not found" }, { status: 404 })
    }

    await prisma.taxMinimisationStrategy.delete({
      where: { id },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Delete",
        entityType: "TaxMinimisationStrategy",
        entityId: id,
        details: `Deleted tax strategy "${existing.category}" - ${existing.title}`,
        organizationId: orgId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting tax strategy:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
