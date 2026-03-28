import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateSignature } from "@/lib/webhook-dispatcher"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const webhooks = await prisma.webhook.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(webhooks)
  } catch (error) {
    console.error("Error fetching webhooks:", error)
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
    const { name, url, events, secret } = body

    if (!name || !url || !events) {
      return NextResponse.json(
        { error: "Name, URL, and events are required" },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return NextResponse.json(
          { error: "URL must use HTTP or HTTPS" },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      )
    }

    const webhook = await prisma.webhook.create({
      data: {
        organizationId: orgId,
        name,
        url,
        events,
        secret: secret || null,
      },
    })

    return NextResponse.json(webhook, { status: 201 })
  } catch (error) {
    console.error("Error creating webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()

    // Handle test action
    if (body.action === "test") {
      const testPayload = JSON.stringify({
        event: "test",
        timestamp: new Date().toISOString(),
        data: { message: "This is a test webhook payload" },
      })

      const signature = body.secret
        ? generateSignature(testPayload, body.secret)
        : null

      console.log("[Webhook Test]")
      console.log(`  -> URL: ${body.url}`)
      if (signature) {
        console.log(`  -> Signature: sha256=${signature}`)
      }
      console.log(`  -> Payload: ${testPayload}`)

      return NextResponse.json({ success: true, message: "Test payload logged" })
    }

    // Handle toggle/update
    const { id, isActive, name, url, events, secret } = body

    if (!id) {
      return NextResponse.json(
        { error: "Webhook ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.webhook.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (typeof isActive === "boolean") updateData.isActive = isActive
    if (name) updateData.name = name
    if (url) updateData.url = url
    if (events) updateData.events = events
    if (secret !== undefined) updateData.secret = secret || null

    const updated = await prisma.webhook.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Webhook ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.webhook.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      )
    }

    await prisma.webhook.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
