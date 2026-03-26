import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get("format")
    const dataType = searchParams.get("dataType") || "accounts"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const validFormats = ["xero-csv", "myob-csv", "generic-csv"]
    if (!format || !validFormats.includes(format)) {
      return NextResponse.json(
        {
          error: `Invalid format. Must be one of: ${validFormats.join(", ")}`,
        },
        { status: 400 }
      )
    }

    const validDataTypes = ["accounts", "contacts", "transactions"]
    if (!validDataTypes.includes(dataType)) {
      return NextResponse.json(
        {
          error: `Invalid dataType. Must be one of: ${validDataTypes.join(", ")}`,
        },
        { status: 400 }
      )
    }

    let csvContent = ""
    let fileName = ""

    if (dataType === "accounts") {
      const accounts = await prisma.account.findMany({
        where: { organizationId: orgId },
        orderBy: [{ type: "asc" }, { code: "asc" }],
      })

      if (format === "xero-csv") {
        csvContent = "*Code,*Name,Type,Tax Type,Description\n"
        csvContent += accounts
          .map(
            (a) =>
              `${escapeCSV(a.code)},${escapeCSV(a.name)},${escapeCSV(a.type)},${escapeCSV(a.taxType)},${escapeCSV(a.description)}`
          )
          .join("\n")
        fileName = "chart-of-accounts-xero.csv"
      } else if (format === "myob-csv") {
        csvContent =
          "Account Number,Account Name,Header,Account Type,Tax Code,Opening Balance\n"
        csvContent += accounts
          .map(
            (a) =>
              `${escapeCSV(a.code)},${escapeCSV(a.name)},N,${escapeCSV(a.type)},${escapeCSV(a.taxType)},0.00`
          )
          .join("\n")
        fileName = "chart-of-accounts-myob.csv"
      } else {
        csvContent =
          "Code,Name,Type,Sub Type,Tax Type,Description,R&D Eligible,Active\n"
        csvContent += accounts
          .map(
            (a) =>
              `${escapeCSV(a.code)},${escapeCSV(a.name)},${escapeCSV(a.type)},${escapeCSV(a.subType)},${escapeCSV(a.taxType)},${escapeCSV(a.description)},${a.isRdEligible ? "Yes" : "No"},${a.isActive ? "Yes" : "No"}`
          )
          .join("\n")
        fileName = "chart-of-accounts.csv"
      }
    } else if (dataType === "contacts") {
      const contacts = await prisma.contact.findMany({
        where: { organizationId: orgId },
        orderBy: { name: "asc" },
      })

      if (format === "xero-csv") {
        csvContent =
          "*ContactName,EmailAddress,FirstName,LastName,AccountNumber,TaxNumber,ContactType\n"
        csvContent += contacts
          .map(
            (c) =>
              `${escapeCSV(c.name)},${escapeCSV(c.email)},,,${escapeCSV(c.abn)},${escapeCSV(c.abn)},${c.contactType === "Customer" ? "Customer" : "Supplier"}`
          )
          .join("\n")
        fileName = "contacts-xero.csv"
      } else if (format === "myob-csv") {
        csvContent =
          "Co./Last Name,First Name,Card Type,ABN,Email,Phone\n"
        csvContent += contacts
          .map(
            (c) =>
              `${escapeCSV(c.name)},,${c.contactType === "Customer" ? "Customer" : "Supplier"},${escapeCSV(c.abn)},${escapeCSV(c.email)},${escapeCSV(c.phone)}`
          )
          .join("\n")
        fileName = "contacts-myob.csv"
      } else {
        csvContent =
          "Name,Email,Phone,ABN,Type,Address,City,State,Postcode,R&D Contractor\n"
        csvContent += contacts
          .map(
            (c) =>
              `${escapeCSV(c.name)},${escapeCSV(c.email)},${escapeCSV(c.phone)},${escapeCSV(c.abn)},${escapeCSV(c.contactType)},${escapeCSV(c.address)},${escapeCSV(c.city)},${escapeCSV(c.state)},${escapeCSV(c.postcode)},${c.isRdContractor ? "Yes" : "No"}`
          )
          .join("\n")
        fileName = "contacts.csv"
      }
    } else if (dataType === "transactions") {
      const where: Record<string, unknown> = { organizationId: orgId }
      if (startDate || endDate) {
        where.date = {}
        if (startDate)
          (where.date as Record<string, unknown>).gte = new Date(startDate)
        if (endDate)
          (where.date as Record<string, unknown>).lte = new Date(endDate)
      }

      const transactions = await prisma.bankTransaction.findMany({
        where,
        orderBy: { date: "desc" },
      })

      if (format === "xero-csv") {
        csvContent = "*Date,*Amount,Description,Reference,Reconciled\n"
        csvContent += transactions
          .map(
            (t) =>
              `${t.date.toISOString().split("T")[0]},${t.amount},${escapeCSV(t.description)},${escapeCSV(t.reference)},${t.reconciled ? "Yes" : "No"}`
          )
          .join("\n")
        fileName = "transactions-xero.csv"
      } else if (format === "myob-csv") {
        csvContent = "Date,Amount,Memo,Cheque No.,Inclusive\n"
        csvContent += transactions
          .map(
            (t) =>
              `${t.date.toISOString().split("T")[0]},${t.amount},${escapeCSV(t.description)},${escapeCSV(t.reference)},Y`
          )
          .join("\n")
        fileName = "transactions-myob.csv"
      } else {
        csvContent =
          "Date,Amount,Description,Reference,Reconciled\n"
        csvContent += transactions
          .map(
            (t) =>
              `${t.date.toISOString().split("T")[0]},${t.amount},${escapeCSV(t.description)},${escapeCSV(t.reference)},${t.reconciled ? "Yes" : "No"}`
          )
          .join("\n")
        fileName = "transactions.csv"
      }
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error exporting data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
