import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (session.user as any).organizationId as string

  try {
    const body = await request.json()
    const { templateName, description, activities } = body

    if (!templateName || !activities?.length) {
      return NextResponse.json(
        { error: "Template name and activities are required" },
        { status: 400 }
      )
    }

    const project = await prisma.rdProject.create({
      data: {
        name: templateName,
        description: description || "",
        startDate: new Date(),
        status: "Active",
        eligibilityStatus: "Pending",
        organizationId: orgId,
        activities: {
          create: activities.map(
            (a: { name: string; type: string; description: string }) => ({
              name: a.name,
              activityType: a.type === "Core" ? "Core" : "Supporting",
              methodology: a.description,
              status: "InProgress",
            })
          ),
        },
      },
      include: { activities: true },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Error creating project from template:", error)
    return NextResponse.json(
      { error: "Failed to create project from template" },
      { status: 500 }
    )
  }
}
