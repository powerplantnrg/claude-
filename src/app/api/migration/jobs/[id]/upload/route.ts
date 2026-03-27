import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  parseXeroAccounts,
  parseXeroContacts,
  parseXeroInvoices,
} from "@/lib/migration/xero-parser"
import {
  parseMYOBAccounts,
  parseMYOBCards,
  parseMYOBSales,
} from "@/lib/migration/myob-parser"

type ParseResult = {
  records: Array<{
    sourceId: string
    sourceCode: string
    sourceName: string
    sourceData: Record<string, unknown>
  }>
  errors: string[]
}

type ParserFn = (csvData: string) => ParseResult

const PARSERS: Record<string, Record<string, ParserFn>> = {
  Xero: {
    accounts: parseXeroAccounts as unknown as ParserFn,
    contacts: parseXeroContacts as unknown as ParserFn,
    invoices: parseXeroInvoices as unknown as ParserFn,
  },
  MYOB: {
    accounts: parseMYOBAccounts as unknown as ParserFn,
    contacts: parseMYOBCards as unknown as ParserFn,
    invoices: parseMYOBSales as unknown as ParserFn,
  },
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
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

    if (!["Pending", "Validating"].includes(job.status)) {
      return NextResponse.json(
        { error: "Upload is only allowed when job status is Pending or Validating" },
        { status: 400 }
      )
    }

    let csvData: string
    let entityType: string

    // Support both multipart form data and JSON body
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") as File | null
      entityType = (formData.get("entityType") as string) || ""

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      csvData = await file.text()
    } else {
      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
      }

      csvData = body.csvData as string
      entityType = body.entityType as string
    }

    if (!csvData || !entityType) {
      return NextResponse.json(
        { error: "Fields 'csvData' (or file) and 'entityType' are required" },
        { status: 400 }
      )
    }

    const validEntityTypes = ["accounts", "contacts", "invoices"]
    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { error: `Invalid entityType. Must be one of: ${validEntityTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // Select parser based on source system
    const systemParsers = PARSERS[job.sourceSystem]
    if (!systemParsers) {
      return NextResponse.json(
        { error: `No parsers available for source system '${job.sourceSystem}'` },
        { status: 400 }
      )
    }

    const parser = systemParsers[entityType]
    if (!parser) {
      return NextResponse.json(
        { error: `No parser available for entity type '${entityType}' in ${job.sourceSystem}` },
        { status: 400 }
      )
    }

    // Parse the CSV data
    const parseResult = parser(csvData)

    // Create MigrationMapping records for each parsed record
    const mappings = await Promise.all(
      parseResult.records.map((record) =>
        prisma.migrationMapping.create({
          data: {
            migrationJobId: id,
            entityType,
            sourceId: record.sourceId,
            sourceCode: record.sourceCode,
            sourceName: record.sourceName,
            sourceData: record.sourceData as any,
            status: "Pending",
            requiresReview: false,
          },
        })
      )
    )

    // Store source data snapshot
    const existingSnapshot = job.sourceDataSnapshot ? JSON.parse(job.sourceDataSnapshot) as Record<string, unknown> : {}
    await prisma.migrationJob.update({
      where: { id },
      data: {
        sourceDataSnapshot: {
          ...existingSnapshot,
          [entityType]: {
            uploadedAt: new Date().toISOString(),
            recordCount: parseResult.records.length,
            parseErrors: parseResult.errors,
          },
        } as any,
        totalRecords: {
          increment: parseResult.records.length,
        },
      },
    })

    await prisma.migrationAuditLog.create({
      data: {
        migrationJobId: id,
        action: "DataUploaded",
        entityType,
        entityId: id,
        details: `Uploaded ${parseResult.records.length} ${entityType} records from ${job.sourceSystem}. ${parseResult.errors.length} parse errors.`,
        userId,
        timestamp: new Date(),
      },
    })

    return NextResponse.json(
      {
        success: true,
        entityType,
        totalParsed: parseResult.records.length,
        mappingsCreated: mappings.length,
        parseErrors: parseResult.errors,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error uploading migration data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
