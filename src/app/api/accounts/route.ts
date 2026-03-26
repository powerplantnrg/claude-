import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type")
  const active = searchParams.get("active")
  const rdEligible = searchParams.get("rdEligible")

  const where: Record<string, unknown> = { organizationId: orgId }
  if (type) where.type = type
  if (active !== null) where.isActive = active === "true"
  if (rdEligible !== null) where.isRdEligible = rdEligible === "true"

  const accounts = await prisma.account.findMany({
    where,
    orderBy: [{ type: "asc" }, { code: "asc" }],
  })

  return NextResponse.json(accounts)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { code, name, type, subType, description, taxType, isRdEligible } = body as {
    code?: string
    name?: string
    type?: string
    subType?: string
    description?: string
    taxType?: string
    isRdEligible?: boolean
  }

  // Validation
  if (!code || !name || !type) {
    return NextResponse.json(
      { error: "Fields 'code', 'name', and 'type' are required" },
      { status: 400 }
    )
  }

  const validTypes = ["Asset", "Liability", "Equity", "Revenue", "Expense"]
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid account type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    )
  }

  // Check code uniqueness within org
  const existing = await prisma.account.findUnique({
    where: {
      code_organizationId: {
        code,
        organizationId: orgId,
      },
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: `An account with code '${code}' already exists` },
      { status: 409 }
    )
  }

  const account = await prisma.account.create({
    data: {
      code,
      name,
      type,
      subType: subType ?? null,
      description: description ?? null,
      taxType: taxType ?? null,
      isRdEligible: isRdEligible ?? false,
      organizationId: orgId,
    },
  })

  return NextResponse.json(account, { status: 201 })
}
