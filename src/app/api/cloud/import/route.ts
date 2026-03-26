import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface CostEntryInput {
  date: string
  service: string
  amount: string | number
  currency?: string
  provider: string
  tags?: string
  description?: string
}

interface ImportError {
  row: number
  message: string
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId as string

  let entries: CostEntryInput[]
  try {
    const body = await request.json()
    entries = body.entries
    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Request body must contain an 'entries' array" },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Fetch all providers for this org to validate provider names
  const providers = await prisma.cloudProvider.findMany({
    where: { organizationId: orgId },
  })
  const providerMap = new Map<string, string>()
  for (const p of providers) {
    providerMap.set(p.name.toLowerCase(), p.id)
    providerMap.set(p.displayName.toLowerCase(), p.id)
  }

  const errors: ImportError[] = []
  let imported = 0

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const rowNum = i + 1

    // Validate date
    if (!entry.date) {
      errors.push({ row: rowNum, message: "Missing date" })
      continue
    }
    const parsedDate = new Date(entry.date)
    if (isNaN(parsedDate.getTime())) {
      errors.push({ row: rowNum, message: `Invalid date format: "${entry.date}"` })
      continue
    }

    // Validate amount
    const amount =
      typeof entry.amount === "number"
        ? entry.amount
        : parseFloat(String(entry.amount).replace(/[$,]/g, ""))
    if (isNaN(amount)) {
      errors.push({ row: rowNum, message: `Invalid amount: "${entry.amount}"` })
      continue
    }

    // Validate service
    if (!entry.service || entry.service.trim() === "") {
      errors.push({ row: rowNum, message: "Missing service name" })
      continue
    }

    // Validate provider
    if (!entry.provider || entry.provider.trim() === "") {
      errors.push({ row: rowNum, message: "Missing provider" })
      continue
    }
    const providerId = providerMap.get(entry.provider.toLowerCase().trim())
    if (!providerId) {
      errors.push({
        row: rowNum,
        message: `Unknown provider: "${entry.provider}". Available: ${providers.map((p) => p.displayName).join(", ")}`,
      })
      continue
    }

    try {
      await prisma.cloudCostEntry.create({
        data: {
          providerId,
          date: parsedDate,
          service: entry.service.trim(),
          description: entry.description?.trim() || null,
          amount,
          currency: entry.currency?.trim() || "AUD",
          tags: entry.tags?.trim() || null,
        },
      })
      imported++
    } catch (err) {
      errors.push({
        row: rowNum,
        message: `Database error: ${err instanceof Error ? err.message : "Unknown error"}`,
      })
    }
  }

  // Audit log
  if (imported > 0) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "Import",
        entityType: "CloudCostEntry",
        details: `Imported ${imported} cloud cost entries (${errors.length} errors)`,
        organizationId: orgId,
      },
    })
  }

  return NextResponse.json({ imported, errors })
}
