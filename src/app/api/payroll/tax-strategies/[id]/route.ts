import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const userId = (session.user as any).id as string
    const { id } = await params

    const existing = await prisma.taxMinimisationStrategy.findFirst({
      where: { id, organizationId: orgId },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeNumber: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Tax strategy not found" }, { status: 404 })
    }

    const body = await request.json()
    const { status, estimatedSavings, actualSavings, description, details, implementedAt } = body

    const updateData: any = {}
    if (status) updateData.status = status
    if (estimatedSavings !== undefined) updateData.estimatedSavings = estimatedSavings
    if (actualSavings !== undefined) updateData.actualSavings = actualSavings
    if (description) updateData.description = description
    if (details) updateData.details = details

    // If marking as implemented, set the implementation date
    if (status === "Implemented") {
      updateData.implementedAt = implementedAt ? new Date(implementedAt) : new Date()
    }

    const updated = await prisma.taxMinimisationStrategy.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeNumber: true },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Update",
        entityType: "TaxMinimisationStrategy",
        entityId: id,
        details: `Updated tax strategy "${existing.strategyType}" for ${existing.employee.firstName} ${existing.employee.lastName}${status ? ` - status: ${status}` : ""}`,
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const userId = (session.user as any).id as string
    const { id } = await params

    const existing = await prisma.taxMinimisationStrategy.findFirst({
      where: { id, organizationId: orgId },
      include: {
        employee: {
          select: { firstName: true, lastName: true },
        },
      },
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
        details: `Deleted tax strategy "${existing.strategyType}" for ${existing.employee.firstName} ${existing.employee.lastName}`,
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
