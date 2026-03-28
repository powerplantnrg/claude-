import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const tokens = await prisma.customerPortalToken.findMany({
      where: { organizationId: orgId },
      include: {
        contact: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(tokens)
  } catch (error) {
    console.error("Error fetching portal tokens:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const { contactId } = body

    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      )
    }

    // Verify contact exists and belongs to the organization
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, organizationId: orgId },
    })

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    // Generate a unique token
    const token = randomUUID()

    // Set expiry to 90 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const portalToken = await prisma.customerPortalToken.create({
      data: {
        organizationId: orgId,
        contactId,
        token,
        expiresAt,
        isActive: true,
      },
      include: {
        contact: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(portalToken, { status: 201 })
  } catch (error) {
    console.error("Error creating portal token:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
