import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    activityId,
    answers,
    result,
    explanation,
  } = body as {
    activityId?: string
    answers: Record<string, string>
    result: "eligible" | "possibly_eligible" | "unlikely_eligible"
    explanation: string
  }

  if (!answers || !result || !explanation) {
    return NextResponse.json(
      { error: "Missing required fields: answers, result, explanation" },
      { status: 400 }
    )
  }

  // If an activityId is provided, update the activity with eligibility info
  if (activityId) {
    const orgId = (session.user as any).organizationId

    // Verify the activity belongs to the user's organization
    const activity = await prisma.rdActivity.findFirst({
      where: {
        id: activityId,
        rdProject: { organizationId: orgId },
      },
    })

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      )
    }

    // Store assessment information in the activity's outcome field
    await prisma.rdActivity.update({
      where: { id: activityId },
      data: {
        outcome: JSON.stringify({
          eligibilityAssessment: {
            answers,
            result,
            explanation,
            assessedAt: new Date().toISOString(),
            assessedBy: session.user.email,
          },
        }),
      },
    })
  }

  return NextResponse.json({
    success: true,
    activityId: activityId || null,
    result,
    explanation,
  })
}
