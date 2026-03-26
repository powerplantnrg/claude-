import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const orgId = (session.user as Record<string, unknown>).organizationId as string

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const limit = parseInt(searchParams.get("limit") || "50")

  const entries = await prisma.journalEntry.findMany({
    where: {
      organizationId: orgId,
      ...(status ? { status } : {}),
    },
    include: {
      lines: {
        include: {
          account: true,
          rdProject: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: limit,
  })

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any
  const orgId = user.organizationId as string
  const userId = user.id as string

  const body = await req.json()
  const { date, narration, reference, lines, status: entryStatus } = body

  // Validate debits equal credits
  const totalDebits = lines.reduce((sum: number, l: { debit: number }) => sum + (l.debit || 0), 0)
  const totalCredits = lines.reduce((sum: number, l: { credit: number }) => sum + (l.credit || 0), 0)

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return NextResponse.json(
      { error: "Total debits must equal total credits" },
      { status: 400 }
    )
  }

  // Get next entry number
  const lastEntry = await prisma.journalEntry.findFirst({
    where: { organizationId: orgId },
    orderBy: { entryNumber: "desc" },
  })
  const entryNumber = (lastEntry?.entryNumber || 0) + 1

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: new Date(date),
      reference,
      narration,
      status: entryStatus || "Draft",
      organizationId: orgId,
      lines: {
        create: lines.map((line: {
          accountId: string
          description?: string
          debit?: number
          credit?: number
          taxCode?: string
          rdProjectId?: string
          rdActivityId?: string
          experimentId?: string
        }) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.debit || 0,
          credit: line.credit || 0,
          taxCode: line.taxCode,
          rdProjectId: line.rdProjectId || null,
          rdActivityId: line.rdActivityId || null,
          experimentId: line.experimentId || null,
        })),
      },
    },
    include: {
      lines: { include: { account: true } },
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: "Create",
      entityType: "JournalEntry",
      entityId: entry.id,
      details: `Created journal entry #${entryNumber}: ${narration}`,
      organizationId: orgId,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
