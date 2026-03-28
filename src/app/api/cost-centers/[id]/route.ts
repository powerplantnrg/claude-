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

    const costCenter = await prisma.costCenter.findFirst({
      where: { id, organizationId: orgId },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: {
          select: { id: true, name: true, code: true, isActive: true },
          orderBy: { code: "asc" },
        },
        allocations: {
          include: {
            journalLine: {
              include: {
                account: { select: { name: true, code: true } },
                journalEntry: { select: { date: true, narration: true } },
              },
            },
          },
          orderBy: { id: "desc" },
        },
      },
    })

    if (!costCenter) {
      return NextResponse.json({ error: "Cost center not found" }, { status: 404 })
    }

    // Calculate summary
    const totalSpending = costCenter.allocations.reduce(
      (sum: number, a: { amount: number }) => sum + (a.amount ?? 0),
      0
    )

    // Group allocations by account for spending breakdown
    const spendingByAccount: Record<string, { name: string; code: string; total: number }> = {}
    for (const alloc of costCenter.allocations) {
      const acct = alloc.journalLine?.account
      if (acct) {
        const key = acct.code
        if (!spendingByAccount[key]) {
          spendingByAccount[key] = { name: acct.name, code: acct.code, total: 0 }
        }
        spendingByAccount[key].total += alloc.amount ?? 0
      }
    }

    return NextResponse.json({
      ...costCenter,
      summary: {
        totalSpending,
        allocationCount: costCenter.allocations.length,
        spendingByAccount: Object.values(spendingByAccount).sort(
          (a, b) => b.total - a.total
        ),
      },
    })
  } catch (error) {
    console.error("Error fetching cost center:", error)
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

    const costCenter = await prisma.costCenter.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!costCenter) {
      return NextResponse.json({ error: "Cost center not found" }, { status: 404 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.type !== undefined) updateData.type = body.type
    if (body.parentId !== undefined) updateData.parentId = body.parentId || null
    if (body.managerId !== undefined) updateData.managerId = body.managerId || null
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const updated = await prisma.costCenter.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating cost center:", error)
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

    const costCenter = await prisma.costCenter.findFirst({
      where: { id, organizationId: orgId },
      include: { children: { select: { id: true } }, allocations: { select: { id: true } } },
    })

    if (!costCenter) {
      return NextResponse.json({ error: "Cost center not found" }, { status: 404 })
    }

    if (costCenter.children.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete a cost center with child centers" },
        { status: 400 }
      )
    }

    if (costCenter.allocations.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete a cost center with existing allocations. Deactivate it instead." },
        { status: 400 }
      )
    }

    await prisma.costCenter.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting cost center:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
