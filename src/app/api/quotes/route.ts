import { NextResponse } from "next/server"
import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""

    const where: any = { organizationId: orgId }

    if (search) {
      where.OR = [
        { quoteNumber: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    if (status) {
      where.status = status
    }

    const quotes = await prisma.quote.findMany({
      where,
      include: { contact: { select: { name: true } } },
      orderBy: { issueDate: "desc" },
    })

    return NextResponse.json(quotes)
  } catch (error) {
    console.error("Error fetching quotes:", error)
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
    const { contactId, issueDate, expiryDate, reference, notes, terms, lines } = body

    if (!contactId || !issueDate || !expiryDate || !lines || lines.length === 0) {
      return NextResponse.json(
        { error: "Contact, issue date, expiry date, and at least one line item are required" },
        { status: 400 }
      )
    }

    // Calculate totals
    let subtotal = 0
    let taxTotal = 0

    const processedLines = lines.map(
      (line: {
        description: string
        quantity: number
        unitPrice: number
        accountId: string
        taxRateId?: string | null
        sortOrder?: number
      }, index: number) => {
        const lineAmount = line.quantity * line.unitPrice
        const lineTax = line.taxRateId ? lineAmount * 0.1 : 0
        subtotal += lineAmount
        taxTotal += lineTax
        return {
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          accountId: line.accountId,
          taxRateId: line.taxRateId || null,
          taxAmount: lineTax,
          lineAmount,
          sortOrder: line.sortOrder ?? index,
        }
      }
    )

    const total = subtotal + taxTotal

    // Generate quote number
    const count = await prisma.quote.count({
      where: { organizationId: orgId },
    })
    const quoteNumber = `QTE-${String(count + 1).padStart(4, "0")}`

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        contactId,
        issueDate: new Date(issueDate),
        expiryDate: new Date(expiryDate),
        reference: reference || null,
        status: "Draft",
        subtotal,
        taxTotal,
        total,
        notes: notes || null,
        terms: terms || null,
        organizationId: orgId,
        lines: {
          create: processedLines,
        },
      },
      include: {
        contact: { select: { name: true } },
        lines: true,
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error("Error creating quote:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
