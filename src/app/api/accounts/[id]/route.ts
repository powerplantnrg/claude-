import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const account = await prisma.account.findFirst({
      where: { id, organizationId: orgId },
      include: {
        _count: {
          select: { journalLines: true },
        },
      },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error("Error fetching account:", error)
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
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const account = await prisma.account.findFirst({
      where: { id, organizationId: orgId },
      include: {
        _count: {
          select: { journalLines: true },
        },
      },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { code, name, type, subType, description, taxType, isRdEligible, isActive } =
      body as {
        code?: string
        name?: string
        type?: string
        subType?: string
        description?: string
        taxType?: string
        isRdEligible?: boolean
        isActive?: boolean
      }

    // Cannot change type if journal lines exist
    if (type !== undefined && type !== account.type && account._count.journalLines > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot change account type because this account has existing journal lines. Remove or reassign journal lines first.",
        },
        { status: 400 }
      )
    }

    // Validate type if provided
    if (type !== undefined) {
      const validTypes = ["Asset", "Liability", "Equity", "Revenue", "Expense"]
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid account type. Must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        )
      }
    }

    // Validate name if provided
    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: "Field 'name' cannot be empty" },
        { status: 400 }
      )
    }

    // Check code uniqueness if code is changing
    if (code !== undefined && code !== account.code) {
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
    }

    const data: Record<string, unknown> = {}
    if (code !== undefined) data.code = code
    if (name !== undefined) data.name = name
    if (type !== undefined) data.type = type
    if (subType !== undefined) data.subType = subType || null
    if (description !== undefined) data.description = description || null
    if (taxType !== undefined) data.taxType = taxType || null
    if (isRdEligible !== undefined) data.isRdEligible = isRdEligible
    if (isActive !== undefined) data.isActive = isActive

    const updated = await prisma.account.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating account:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const account = await prisma.account.findFirst({
      where: { id, organizationId: orgId },
      include: {
        _count: {
          select: { journalLines: true },
        },
      },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    if (account._count.journalLines > 0) {
      // Archive instead of delete
      const archived = await prisma.account.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        archived: true,
        message: `Account archived because it has ${account._count.journalLines} journal line(s). Set to inactive.`,
        account: archived,
      })
    }

    await prisma.account.delete({ where: { id } })

    return NextResponse.json({ success: true, archived: false })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
