import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { testRule } from "@/lib/bank-rules"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string

  const rules = await prisma.bankRule.findMany({
    where: { organizationId: orgId },
    include: {
      account: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(rules)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const body = await request.json()

  // Handle test mode
  if (body.test) {
    const { matchField, matchType, matchValue } = body.test
    if (!matchField || !matchType || !matchValue) {
      return NextResponse.json(
        { error: "matchField, matchType, and matchValue are required for testing" },
        { status: 400 }
      )
    }

    const transactions = await prisma.bankTransaction.findMany({
      where: { organizationId: orgId, reconciled: false },
      orderBy: { date: "desc" },
      take: 200,
    })

    const txData = transactions.map((tx) => ({
      id: tx.id,
      date: tx.date.toISOString(),
      description: tx.description,
      amount: tx.amount,
      reference: tx.reference,
      reconciled: tx.reconciled,
    }))

    const matches = testRule(txData, matchField, matchType, matchValue)
    return NextResponse.json({ matches })
  }

  const { name, matchField, matchType, matchValue, accountId, contactId, taxType, rdProjectId, priority } = body

  if (!name || !matchField || !matchType || !matchValue || !accountId) {
    return NextResponse.json(
      { error: "name, matchField, matchType, matchValue, and accountId are required" },
      { status: 400 }
    )
  }

  const rule = await prisma.bankRule.create({
    data: {
      organizationId: orgId,
      name,
      matchField,
      matchType,
      matchValue,
      accountId,
      contactId: contactId || null,
      taxType: taxType || null,
      rdProjectId: rdProjectId || null,
      priority: priority ?? 0,
    },
    include: {
      account: { select: { id: true, code: true, name: true } },
    },
  })

  return NextResponse.json(rule, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: "Rule id is required" }, { status: 400 })
  }

  const existing = await prisma.bankRule.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  const allowedFields = [
    "name", "matchField", "matchType", "matchValue",
    "accountId", "contactId", "taxType", "rdProjectId",
    "isActive", "priority",
  ]

  const data: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in updates) {
      data[key] = updates[key]
    }
  }

  const updated = await prisma.bankRule.update({
    where: { id },
    data,
    include: {
      account: { select: { id: true, code: true, name: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Rule id is required" }, { status: 400 })
  }

  const existing = await prisma.bankRule.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  await prisma.bankRule.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
