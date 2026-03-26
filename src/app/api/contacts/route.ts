import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get("search")
  const type = searchParams.get("type")
  const rdContractor = searchParams.get("rdContractor")

  const where: Record<string, unknown> = { organizationId: orgId }

  if (type && ["Customer", "Supplier", "Both"].includes(type)) {
    where.contactType = type
  }

  if (rdContractor !== null && rdContractor !== undefined) {
    where.isRdContractor = rdContractor === "true"
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { abn: { contains: search } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { name: "asc" },
  })

  return NextResponse.json(contacts)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    name,
    email,
    phone,
    abn,
    contactType,
    address,
    city,
    state,
    postcode,
    isRdContractor,
  } = body as {
    name?: string
    email?: string
    phone?: string
    abn?: string
    contactType?: string
    address?: string
    city?: string
    state?: string
    postcode?: string
    isRdContractor?: boolean
  }

  // Validation
  if (!name) {
    return NextResponse.json(
      { error: "Field 'name' is required" },
      { status: 400 }
    )
  }

  const validTypes = ["Customer", "Supplier", "Both"]
  const resolvedType = contactType ?? "Customer"
  if (!validTypes.includes(resolvedType)) {
    return NextResponse.json(
      {
        error: `Invalid contact type. Must be one of: ${validTypes.join(", ")}`,
      },
      { status: 400 }
    )
  }

  // Validate email format if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address format" },
      { status: 400 }
    )
  }

  // Validate ABN format if provided (Australian Business Number: 11 digits)
  if (abn) {
    const cleanAbn = abn.replace(/\s/g, "")
    if (!/^\d{11}$/.test(cleanAbn)) {
      return NextResponse.json(
        { error: "Invalid ABN format. Must be 11 digits." },
        { status: 400 }
      )
    }
  }

  const contact = await prisma.contact.create({
    data: {
      name,
      email: email ?? null,
      phone: phone ?? null,
      abn: abn ?? null,
      contactType: resolvedType,
      address: address ?? null,
      city: city ?? null,
      state: state ?? null,
      postcode: postcode ?? null,
      isRdContractor: isRdContractor ?? false,
      organizationId: orgId,
    },
  })

  return NextResponse.json(contact, { status: 201 })
}
