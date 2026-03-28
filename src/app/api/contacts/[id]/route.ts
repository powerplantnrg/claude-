import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, organizationId: orgId },
      include: {
        invoices: {
          orderBy: { date: "desc" },
          select: { id: true, invoiceNumber: true, status: true, total: true, date: true, dueDate: true },
        },
        bills: {
          orderBy: { date: "desc" },
          select: { id: true, billNumber: true, status: true, total: true, date: true, dueDate: true },
        },
        _count: {
          select: { invoices: true, bills: true },
        },
      },
    })

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error("Error fetching contact:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const {
      name,
      email,
      phone,
      abn,
      contactType,
      address,
      city,
      state,
      postcode,
      isRdContractor,
    } = body as {
      name?: string
      email?: string
      phone?: string
      abn?: string
      contactType?: string
      address?: string
      city?: string
      state?: string
      postcode?: string
      isRdContractor?: boolean
    }

    // Validate name if provided
    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: "Field 'name' cannot be empty" },
        { status: 400 }
      )
    }

    // Validate contact type if provided
    if (contactType !== undefined) {
      const validTypes = ["Customer", "Supplier", "Both"]
      if (!validTypes.includes(contactType)) {
        return NextResponse.json(
          { error: `Invalid contact type. Must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        )
      }
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      )
    }

    // Validate ABN format if provided
    if (abn) {
      const cleanAbn = abn.replace(/\s/g, "")
      if (!/^\d{11}$/.test(cleanAbn)) {
        return NextResponse.json(
          { error: "Invalid ABN format. Must be 11 digits." },
          { status: 400 }
        )
      }
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email || null
    if (phone !== undefined) data.phone = phone || null
    if (abn !== undefined) data.abn = abn || null
    if (contactType !== undefined) data.contactType = contactType
    if (address !== undefined) data.address = address || null
    if (city !== undefined) data.city = city || null
    if (state !== undefined) data.state = state || null
    if (postcode !== undefined) data.postcode = postcode || null
    if (isRdContractor !== undefined) data.isRdContractor = isRdContractor

    const updated = await prisma.contact.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating contact:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId
    const { id } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, organizationId: orgId },
      include: {
        _count: {
          select: { invoices: true, bills: true },
        },
      },
    })

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    if (contact._count.invoices > 0 || contact._count.bills > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete contact with linked records (${contact._count.invoices} invoices, ${contact._count.bills} bills). Remove linked records first.`,
        },
        { status: 400 }
      )
    }

    await prisma.contact.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting contact:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
