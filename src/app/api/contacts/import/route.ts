import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface ContactInput {
  name: string
  email?: string
  phone?: string
  abn?: string
  type?: string
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

  let contacts: ContactInput[]
  try {
    const body = await request.json()
    contacts = body.contacts
    if (!Array.isArray(contacts)) {
      return NextResponse.json(
        { error: "Request body must contain a 'contacts' array" },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Fetch existing contacts for duplicate detection
  const existingContacts = await prisma.contact.findMany({
    where: { organizationId: orgId },
    select: { email: true, abn: true },
  })

  const existingEmails = new Set(
    existingContacts
      .filter((c) => c.email)
      .map((c) => c.email!.toLowerCase().trim())
  )
  const existingAbns = new Set(
    existingContacts
      .filter((c) => c.abn)
      .map((c) => c.abn!.replace(/\s/g, ""))
  )

  const validTypes = ["Customer", "Supplier", "Both"]
  const errors: ImportError[] = []
  let imported = 0
  let duplicates = 0

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]
    const rowNum = i + 1

    // Validate name
    if (!contact.name || contact.name.trim() === "") {
      errors.push({ row: rowNum, message: "Missing name" })
      continue
    }

    // Validate email format if provided
    const email = contact.email?.trim() || ""
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, message: `Invalid email format: "${email}"` })
      continue
    }

    // Validate ABN if provided
    const abn = contact.abn?.replace(/\s/g, "") || ""
    if (abn && !/^\d{11}$/.test(abn)) {
      errors.push({
        row: rowNum,
        message: `Invalid ABN format: "${contact.abn}". Must be 11 digits.`,
      })
      continue
    }

    // Validate type
    const contactType = contact.type?.trim() || "Customer"
    if (!validTypes.includes(contactType)) {
      errors.push({
        row: rowNum,
        message: `Invalid type: "${contact.type}". Must be one of: ${validTypes.join(", ")}`,
      })
      continue
    }

    // Duplicate detection by email or ABN
    if (email && existingEmails.has(email.toLowerCase())) {
      duplicates++
      continue
    }
    if (abn && existingAbns.has(abn)) {
      duplicates++
      continue
    }

    try {
      await prisma.contact.create({
        data: {
          name: contact.name.trim(),
          email: email || null,
          phone: contact.phone?.trim() || null,
          abn: abn || null,
          contactType,
          organizationId: orgId,
        },
      })
      imported++
      // Add to sets for deduplication within the same batch
      if (email) existingEmails.add(email.toLowerCase())
      if (abn) existingAbns.add(abn)
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
        entityType: "Contact",
        details: `Imported ${imported} contacts (${duplicates} duplicates skipped, ${errors.length} errors)`,
        organizationId: orgId,
      },
    })
  }

  return NextResponse.json({ imported, duplicates, errors })
}
