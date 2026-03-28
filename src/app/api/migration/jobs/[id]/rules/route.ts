import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const job = await prisma.migrationJob.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!job) {
      return NextResponse.json({ error: "Migration job not found" }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get("entityType")
    const ruleType = searchParams.get("ruleType")
    const active = searchParams.get("active")

    const where: Record<string, unknown> = { migrationJobId: id }
    if (entityType) where.entityType = entityType
    if (ruleType) where.ruleType = ruleType
    if (active !== null && active !== undefined) {
      where.active = active === "true"
    }

    const rules = await prisma.migrationRule.findMany({
      where,
      orderBy: [{ entityType: "asc" }, { priority: "asc" }],
    })

    return NextResponse.json(rules)
  } catch (error) {
    console.error("Error listing migration rules:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string
    const { id } = await params

    const job = await prisma.migrationJob.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!job) {
      return NextResponse.json({ error: "Migration job not found" }, { status: 404 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const {
      entityType,
      sourceField,
      sourceValue,
      targetField,
      targetValue,
      ruleType,
      description,
      priority,
      active,
    } = body as {
      entityType?: string
      sourceField?: string
      sourceValue?: string
      targetField?: string
      targetValue?: string
      ruleType?: string
      description?: string
      priority?: number
      active?: boolean
    }

    if (!entityType || !sourceField || !targetField || !ruleType) {
      return NextResponse.json(
        { error: "Fields 'entityType', 'sourceField', 'targetField', and 'ruleType' are required" },
        { status: 400 }
      )
    }

    const validRuleTypes = ["Mapping", "Transform", "Filter", "Default"]
    if (!validRuleTypes.includes(ruleType)) {
      return NextResponse.json(
        { error: `Invalid ruleType. Must be one of: ${validRuleTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const rule = await prisma.migrationRule.create({
      data: {
        migrationJobId: id,
        entityType,
        sourceField,
        sourceValue: sourceValue ?? "",
        targetField,
        targetValue: targetValue ?? "",
        ruleType,
        description: description ?? null,
        priority: priority ?? 0,
        active: active ?? true,
      },
    })

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: "RuleCreated",
        entityType: "MigrationRule",
        entityId: rule.id,
        details: `Created ${ruleType} rule for ${entityType}: ${sourceField} -> ${targetField}`,
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error("Error creating migration rule:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string
    const { id } = await params

    const job = await prisma.migrationJob.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!job) {
      return NextResponse.json({ error: "Migration job not found" }, { status: 404 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { ruleId, ...updates } = body as {
      ruleId?: string
      sourceField?: string
      sourceValue?: string
      targetField?: string
      targetValue?: string
      ruleType?: string
      description?: string
      priority?: number
      active?: boolean
    }

    if (!ruleId) {
      return NextResponse.json(
        { error: "Field 'ruleId' is required" },
        { status: 400 }
      )
    }

    const existingRule = await prisma.migrationRule.findFirst({
      where: { id: ruleId, migrationJobId: id },
    })

    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (updates.sourceField !== undefined) data.sourceField = updates.sourceField
    if (updates.sourceValue !== undefined) data.sourceValue = updates.sourceValue
    if (updates.targetField !== undefined) data.targetField = updates.targetField
    if (updates.targetValue !== undefined) data.targetValue = updates.targetValue
    if (updates.ruleType !== undefined) data.ruleType = updates.ruleType
    if (updates.description !== undefined) data.description = updates.description
    if (updates.priority !== undefined) data.priority = updates.priority
    if (updates.active !== undefined) data.active = updates.active

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const updated = await prisma.migrationRule.update({
      where: { id: ruleId },
      data,
    })

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: "RuleUpdated",
        entityType: "MigrationRule",
        entityId: ruleId,
        details: `Updated rule: ${JSON.stringify(data)}`,
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating migration rule:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = session.user as any
    const orgId = user.organizationId as string
    const userId = user.id as string
    const { id } = await params

    const job = await prisma.migrationJob.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!job) {
      return NextResponse.json({ error: "Migration job not found" }, { status: 404 })
    }

    const { searchParams } = request.nextUrl
    const ruleId = searchParams.get("ruleId")

    if (!ruleId) {
      return NextResponse.json(
        { error: "Query parameter 'ruleId' is required" },
        { status: 400 }
      )
    }

    const rule = await prisma.migrationRule.findFirst({
      where: { id: ruleId, migrationJobId: id },
    })

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }

    await prisma.migrationRule.delete({ where: { id: ruleId } })

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: "RuleDeleted",
        entityType: "MigrationRule",
        entityId: ruleId,
        details: `Deleted ${rule.ruleType} rule for ${rule.entityType}: ${rule.sourceField} -> ${rule.targetField}`,
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting migration rule:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
