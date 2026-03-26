import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateRecommendations } from "@/lib/rd-recommendations"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  const recommendations = await generateRecommendations({
    organizationId: orgId,
  })

  return NextResponse.json(recommendations)
}
