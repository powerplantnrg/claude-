import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const provider = await prisma.marketplaceProvider.findUnique({
      where: { id },
    })

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      )
    }

    const capabilities = await prisma.providerCapability.findMany({
      where: { providerId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(capabilities)
  } catch (error) {
    console.error("Error fetching capabilities:", error)
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

    const userId = (session.user as any).id
    const { id } = await params

    const provider = await prisma.marketplaceProvider.findUnique({
      where: { id },
    })

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      )
    }

    if (provider.userId !== userId) {
      return NextResponse.json(
        { error: "You can only add capabilities to your own profile" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { capabilityType, name, description, details } = body

    if (!capabilityType || !name) {
      return NextResponse.json(
        { error: "Capability type and name are required" },
        { status: 400 }
      )
    }

    const capability = await prisma.providerCapability.create({
      data: {
        providerId: id,
        capabilityType,
        name,
        description: description || null,
        details: details || null,
        verificationStatus: "PENDING",
      },
    })

    return NextResponse.json(capability, { status: 201 })
  } catch (error) {
    console.error("Error creating capability:", error)
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

    const userId = (session.user as any).id
    const { id } = await params

    const provider = await prisma.marketplaceProvider.findUnique({
      where: { id },
    })

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      )
    }

    if (provider.userId !== userId) {
      return NextResponse.json(
        { error: "You can only remove capabilities from your own profile" },
        { status: 403 }
      )
    }

    const { capabilityId } = await request.json()

    if (!capabilityId) {
      return NextResponse.json(
        { error: "Capability ID is required" },
        { status: 400 }
      )
    }

    const capability = await prisma.providerCapability.findFirst({
      where: { id: capabilityId, providerId: id },
    })

    if (!capability) {
      return NextResponse.json(
        { error: "Capability not found" },
        { status: 404 }
      )
    }

    await prisma.providerCapability.delete({
      where: { id: capabilityId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting capability:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
