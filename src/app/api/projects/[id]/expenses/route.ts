import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const project = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const expenses = await prisma.projectExpense.findMany({
      where: { projectId: id },
      include: {
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Error fetching project expenses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const project = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { description, amount, date, category, billable, receiptUrl } = body

    if (!description || !amount || !date) {
      return NextResponse.json(
        { error: "Description, amount, and date are required" },
        { status: 400 }
      )
    }

    const expense = await prisma.projectExpense.create({
      data: {
        organizationId: orgId,
        projectId: id,
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        category: category || "General",
        billable: billable !== undefined ? billable : true,
        billed: false,
        receiptUrl: receiptUrl || null,
        approvalStatus: "Pending",
      },
      include: {
        approvedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error("Error creating project expense:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
