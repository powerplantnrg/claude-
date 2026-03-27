import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    const upcoming = url.searchParams.get("upcoming")
    const category = url.searchParams.get("category")

    const where: Record<string, unknown> = { organizationId: orgId }

    if (status) {
      where.status = status
    }

    if (category) {
      where.category = category
    }

    if (upcoming === "true") {
      where.dueDate = { gte: new Date() }
      where.status = { not: "Completed" }
    }

    const deadlines = await prisma.complianceDeadline.findMany({
      where,
      orderBy: { dueDate: "asc" },
    })

    // Group by month for calendar view
    const grouped: Record<string, typeof deadlines> = {}
    for (const d of deadlines) {
      const key = `${d.dueDate.getFullYear()}-${String(d.dueDate.getMonth() + 1).padStart(2, "0")}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(d)
    }

    // Check for overdue items
    const now = new Date()
    const overdue = deadlines.filter(
      (d) => d.dueDate < now && d.status !== "Completed" && d.status !== "Cancelled"
    )

    return NextResponse.json({
      deadlines,
      grouped,
      overdueCount: overdue.length,
    })
  } catch (error) {
    console.error("Error fetching compliance deadlines:", error)
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
    const { title, description, category, dueDate, frequency, reminderDays, generateFY } = body

    // Auto-generate standard FY deadlines
    if (generateFY) {
      const fyYear = body.fyYear || new Date().getFullYear()
      const fyStart = new Date(fyYear, 6, 1) // July 1 (Australian FY)

      const standardDeadlines = [
        { title: "BAS Q1 (Jul-Sep)", category: "BAS", dueDate: new Date(fyYear, 9, 28), frequency: "Quarterly" },
        { title: "BAS Q2 (Oct-Dec)", category: "BAS", dueDate: new Date(fyYear + 1, 1, 28), frequency: "Quarterly" },
        { title: "BAS Q3 (Jan-Mar)", category: "BAS", dueDate: new Date(fyYear + 1, 3, 28), frequency: "Quarterly" },
        { title: "BAS Q4 (Apr-Jun)", category: "BAS", dueDate: new Date(fyYear + 1, 7, 28), frequency: "Quarterly" },
        { title: "PAYG Annual Summary", category: "PAYG", dueDate: new Date(fyYear + 1, 7, 14), frequency: "Annual" },
        { title: "STP Finalisation", category: "STP", dueDate: new Date(fyYear + 1, 6, 14), frequency: "Annual" },
        { title: "Company Tax Return", category: "Tax Return", dueDate: new Date(fyYear + 1, 10, 15), frequency: "Annual" },
        { title: "Fringe Benefits Tax Return", category: "FBT", dueDate: new Date(fyYear + 1, 4, 21), frequency: "Annual" },
        { title: "R&D Tax Incentive Registration", category: "R&D", dueDate: new Date(fyYear + 1, 3, 30), frequency: "Annual" },
        { title: "R&D Tax Incentive Claim", category: "R&D", dueDate: new Date(fyYear + 1, 10, 15), frequency: "Annual" },
        { title: "Superannuation Q1", category: "Super", dueDate: new Date(fyYear, 9, 28), frequency: "Quarterly" },
        { title: "Superannuation Q2", category: "Super", dueDate: new Date(fyYear + 1, 0, 28), frequency: "Quarterly" },
        { title: "Superannuation Q3", category: "Super", dueDate: new Date(fyYear + 1, 3, 28), frequency: "Quarterly" },
        { title: "Superannuation Q4", category: "Super", dueDate: new Date(fyYear + 1, 6, 28), frequency: "Quarterly" },
      ]

      const created = await prisma.complianceDeadline.createMany({
        data: standardDeadlines.map((d) => ({
          title: `FY${fyYear}/${fyYear + 1} - ${d.title}`,
          description: `Auto-generated for FY${fyYear}/${fyYear + 1}`,
          category: d.category,
          dueDate: d.dueDate,
          frequency: d.frequency,
          status: "Pending",
          reminderDays: 14,
          organizationId: orgId,
        })),
      })

      return NextResponse.json(
        { message: `Generated ${created.count} FY deadlines`, count: created.count },
        { status: 201 }
      )
    }

    // Create single deadline
    if (!title || !dueDate || !category) {
      return NextResponse.json(
        { error: "Title, due date, and category are required" },
        { status: 400 }
      )
    }

    const deadline = await prisma.complianceDeadline.create({
      data: {
        title,
        description: description || null,
        category,
        dueDate: new Date(dueDate),
        frequency: frequency || "One-off",
        status: "Pending",
        reminderDays: reminderDays || 14,
        notes: body.notes || null,
        organizationId: orgId,
      },
    })

    return NextResponse.json(deadline, { status: 201 })
  } catch (error) {
    console.error("Error creating compliance deadline:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
