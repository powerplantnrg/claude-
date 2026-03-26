import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  })

  return NextResponse.json(org)
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await request.json()

  const {
    name,
    abn,
    address,
    city,
    state,
    postcode,
    country,
    financialYearEnd,
    baseCurrency,
    aggregatedTurnover,
  } = body

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(name !== undefined && { name }),
      ...(abn !== undefined && { abn }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(postcode !== undefined && { postcode }),
      ...(country !== undefined && { country }),
      ...(financialYearEnd !== undefined && { financialYearEnd }),
      ...(baseCurrency !== undefined && { baseCurrency }),
      ...(aggregatedTurnover !== undefined && { aggregatedTurnover }),
    },
  })

  return NextResponse.json(updated)
}
