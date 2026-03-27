import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const costCenters = await prisma.costCenter.findMany({
      where: { organizationId: orgId },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true } },
        allocations: {
          select: { amount: true },
        },
      },
      orderBy: { code: "asc" },
    })

    // Build hierarchy tree
    const rootCenters = costCenters.filter((c) => !c.parentId)
    const buildTree = (parentId: string | null): any[] => {
      return costCenters
        .filter((c) => c.parentId === parentId)
        .map((c) => ({
          ...c,
          totalSpending: c.allocations.reduce((sum, a) => sum + (a.amount ?? 0), 0),
          children: buildTree(c.id),
        }))
    }

    const hierarchy = buildTree(null)

    return NextResponse.json({
      costCenters,
      hierarchy,
    })
  } catch (error) {
    console.error("Error fetching cost centers:", error)
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

    const body = await request.json()
    const { code, name, description, type, parentId, managerId } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      )
    }

    // Check for duplicate code
    const existing = await prisma.costCenter.findFirst({
      where: { organizationId: orgId, code },
    })

    if (existing) {
      return NextResponse.json(
        { error: "A cost center with this code already exists" },
        { status: 400 }
      )
    }

    const costCenter = await prisma.costCenter.create({
      data: {
        code,
        name,
        description: description || null,
        type: type || "Department",
        parentId: parentId || null,
        managerId: managerId || null,
        isActive: true,
        organizationId: orgId,
      },
    })

    return NextResponse.json(costCenter, { status: 201 })
  } catch (error) {
    console.error("Error creating cost center:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
