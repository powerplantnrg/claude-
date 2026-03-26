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

    const entry = await prisma.rdTimeEntry.findFirst({
      where: {
        id,
        rdActivity: { rdProject: { organizationId: orgId } },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { date, hours, description, hourlyRate } = body

    const updated = await prisma.rdTimeEntry.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(hours !== undefined && { hours: parseFloat(hours) }),
        ...(description !== undefined && {
          description: description || null,
        }),
        ...(hourlyRate !== undefined && {
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        rdActivity: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating time entry:", error)
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
    const { id } = await params

    const entry = await prisma.rdTimeEntry.findFirst({
      where: {
        id,
        rdActivity: { rdProject: { organizationId: orgId } },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      )
    }

    await prisma.rdTimeEntry.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting time entry:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
