import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  const scenarios = await prisma.scenario.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(scenarios)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()
  const { name, description, baselineJson, variablesJson, resultsJson } = body

  if (!name) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    )
  }

  const scenario = await prisma.scenario.create({
    data: {
      name,
      description: description || null,
      baselineJson: baselineJson ? JSON.stringify(baselineJson) : null,
      variablesJson: variablesJson ? JSON.stringify(variablesJson) : null,
      resultsJson: resultsJson ? JSON.stringify(resultsJson) : null,
      organizationId: orgId,
    },
  })

  return NextResponse.json(scenario, { status: 201 })
}
