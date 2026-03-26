import { createHmac } from "crypto"
import { prisma } from "./prisma"

/**
 * Generate an HMAC-SHA256 signature for webhook payload verification.
 */
export function generateSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

/**
 * All supported webhook event types.
 */
export const WEBHOOK_EVENTS = [
  "invoice.created",
  "invoice.sent",
  "invoice.paid",
  "bill.created",
  "payment.received",
  "experiment.completed",
  "grant.milestone_due",
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, unknown>
}

/**
 * Dispatch a webhook event to all matching active webhooks for an organization.
 *
 * In MVP mode, this only logs the dispatch rather than making actual HTTP calls.
 * The structure is in place so that real HTTP delivery can be enabled later.
 */
export async function dispatchWebhook(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<{ dispatched: number; errors: number }> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
    },
  })

  // Filter to webhooks subscribed to this event
  const matching = webhooks.filter((wh) => {
    const events = wh.events.split(",").map((e) => e.trim())
    return events.includes(event)
  })

  if (matching.length === 0) {
    return { dispatched: 0, errors: 0 }
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }

  const payloadStr = JSON.stringify(payload)
  let dispatched = 0
  let errors = 0

  for (const webhook of matching) {
    try {
      const signature = webhook.secret
        ? generateSignature(payloadStr, webhook.secret)
        : null

      // MVP: Log instead of sending real HTTP requests
      console.log(`[Webhook Dispatch] Event: ${event}`)
      console.log(`  -> Webhook: ${webhook.name} (${webhook.id})`)
      console.log(`  -> URL: ${webhook.url}`)
      if (signature) {
        console.log(`  -> Signature: sha256=${signature}`)
      }
      console.log(`  -> Payload: ${payloadStr.substring(0, 200)}...`)

      // When ready for production, uncomment:
      // const response = await fetch(webhook.url, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     ...(signature ? { "X-Webhook-Signature": `sha256=${signature}` } : {}),
      //   },
      //   body: payloadStr,
      // })
      //
      // if (!response.ok) {
      //   throw new Error(`HTTP ${response.status}`)
      // }

      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          failCount: 0,
        },
      })

      dispatched++
    } catch (error) {
      console.error(`[Webhook Error] Failed to dispatch to ${webhook.name}:`, error)

      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          failCount: { increment: 1 },
        },
      })

      errors++
    }
  }

  return { dispatched, errors }
}
