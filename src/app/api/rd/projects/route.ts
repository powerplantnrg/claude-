import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const COMPLIANCE_TEMPLATES = [
  { category: "Documentation", item: "Document core R&D activity hypothesis" },
  { category: "Documentation", item: "Record technical uncertainty" },
  { category: "Documentation", item: "Create experiment logs" },
  { category: "Documentation", item: "Maintain contemporaneous records" },
  { category: "Financial", item: "Track all R&D expenditure separately" },
  { category: "Financial", item: "Allocate staff time to R&D activities" },
  { category: "Financial", item: "Record contractor costs" },
  { category: "Technical", item: "Document methodology" },
  { category: "Technical", item: "Record experiment outcomes (including failures)" },
  { category: "Technical", item: "Capture evidence of systematic progression" },
  { category: "Registration", item: "Register with AusIndustry before deadline" },
  { category: "Registration", item: "Prepare R&D Tax Incentive Schedule" },
  { category: "Registration", item: "Review eligible expenditure categories" },
]

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  const where: any = { organizationId: orgId }
  if (status) where.status = status

  const projects = await prisma.rdProject.findMany({
    where,
    include: {
      activities: {
        include: {
          _count: {
            select: { experiments: true },
          },
        },
      },
      rdExpenses: true,
      complianceChecklist: true,
      _count: {
        select: {
          activities: true,
          rdExpenses: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(projects)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()

  const {
    name,
    description,
    startDate,
    endDate,
    budget,
    coreActivityDescription,
    hypothesisSummary,
    technicalUncertainty,
    newKnowledgeSought,
  } = body

  if (!name || !startDate) {
    return NextResponse.json(
      { error: "Name and start date are required" },
      { status: 400 }
    )
  }

  const project = await prisma.rdProject.create({
    data: {
      name,
      description: description || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      budget: budget ? parseFloat(budget) : null,
      coreActivityDescription: coreActivityDescription || null,
      hypothesisSummary: hypothesisSummary || null,
      technicalUncertainty: technicalUncertainty || null,
      newKnowledgeSought: newKnowledgeSought || null,
      organizationId: orgId,
    },
  })

  // Auto-create compliance checklist items
  await prisma.rdComplianceChecklist.createMany({
    data: COMPLIANCE_TEMPLATES.map((t) => ({
      rdProjectId: project.id,
      item: t.item,
      category: t.category,
    })),
  })

  const fullProject = await prisma.rdProject.findUnique({
    where: { id: project.id },
    include: { complianceChecklist: true },
  })

  return NextResponse.json(fullProject, { status: 201 })
}
