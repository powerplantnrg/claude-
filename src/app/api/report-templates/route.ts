import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string

    const { searchParams } = new URL(req.url)
    const baseReport = searchParams.get("baseReport")

    const templates = await prisma.reportTemplate.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { isPublic: true },
          { createdById: userId },
        ],
        ...(baseReport ? { baseReport } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching report templates:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string

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

    if (!name || !baseReport) {
      return NextResponse.json(
        { error: "name and baseReport are required" },
        { status: 400 }
      )
    }

    const validBaseReports = ["ProfitLoss", "BalanceSheet", "TrialBalance", "CashFlow", "Custom"]
    if (!validBaseReports.includes(baseReport)) {
      return NextResponse.json(
        { error: `baseReport must be one of: ${validBaseReports.join(", ")}` },
        { status: 400 }
      )
    }

    const template = await prisma.reportTemplate.create({
      data: {
        name,
        description: description || null,
        baseReport,
        columns: columns ? JSON.stringify(columns) : "[]",
        filters: filters ? JSON.stringify(filters) : "{}",
        groupBy: groupBy || null,
        dateRange: dateRange || null,
        includeComparison: includeComparison || false,
        isPublic: isPublic || false,
        organizationId: orgId,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "Create",
        entityType: "ReportTemplate",
        entityId: template.id,
        details: `Created report template "${name}" (${baseReport})`,
        organizationId: orgId,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Error creating report template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
