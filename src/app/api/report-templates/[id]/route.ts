import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const { id } = await params

    const template = await prisma.reportTemplate.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...template,
      columns: JSON.parse(template.columns || "[]"),
      filters: JSON.parse(template.filters || "{}"),
    })
  } catch (error) {
    console.error("Error fetching report template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string
    const { id } = await params

    const existing = await prisma.reportTemplate.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const body = await req.json()
    const {
      name,
      description,
      baseReport,
      columns,
      filters,
      groupBy,
      dateRange,
      includeComparison,
      isPublic,
    } = body

    const template = await prisma.reportTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(baseReport !== undefined && { baseReport }),
        ...(columns !== undefined && { columns: JSON.stringify(columns) }),
        ...(filters !== undefined && { filters: JSON.stringify(filters) }),
        ...(groupBy !== undefined && { groupBy }),
        ...(dateRange !== undefined && { dateRange }),
        ...(includeComparison !== undefined && { includeComparison }),
        ...(isPublic !== undefined && { isPublic }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Update",
        entityType: "ReportTemplate",
        entityId: id,
        details: `Updated report template "${template.name}"`,
        organizationId: orgId,
      },
    })

    return NextResponse.json({
      ...template,
      columns: JSON.parse(template.columns || "[]"),
      filters: JSON.parse(template.filters || "{}"),
    })
  } catch (error) {
    console.error("Error updating report template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string
    const { id } = await params

    const existing = await prisma.reportTemplate.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    await prisma.reportTemplate.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Delete",
        entityType: "ReportTemplate",
        entityId: id,
        details: `Deleted report template "${existing.name}"`,
        organizationId: orgId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting report template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
