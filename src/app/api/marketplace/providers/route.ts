import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const location = searchParams.get("location")
    const skills = searchParams.get("skills")
    const minRating = searchParams.get("minRating")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const where: any = {
      status: status || "ACTIVE",
    }

    if (category) {
      where.category = category
    }

    if (location) {
      where.location = { contains: location, mode: "insensitive" }
    }

    if (skills) {
      const skillList = skills.split(",").map((s) => s.trim())
      where.capabilities = {
        some: {
          name: { in: skillList },
        },
      }
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { businessName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [providers, total] = await Promise.all([
      prisma.marketplaceProvider.findMany({
        where,
        include: {
          capabilities: {
            where: { verificationStatus: "VERIFIED" },
            select: { id: true, capabilityType: true, name: true },
          },
          _count: {
            select: { reviews: true, contracts: true },
          },
        },
        skip,
        take: limit,
        orderBy: [{ verified: "desc" }, { rating: "desc" }],
      }),
      prisma.marketplaceProvider.count({ where }),
    ])

    return NextResponse.json({
      providers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error searching providers:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()

    const {
      name,
      businessName,
      abn,
      email,
      phone,
      website,
      description,
      category,
      subcategories,
      qualifications,
      location,
      serviceArea,
      hourlyRate,
      dailyRate,
      preferredPayment,
      notes,
    } = body

    if (!name || !email || !category) {
      return NextResponse.json(
        { error: "Name, email, and category are required" },
        { status: 400 }
      )
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    if (abn) {
      const cleanAbn = abn.replace(/\s/g, "")
      if (!/^\d{11}$/.test(cleanAbn)) {
        return NextResponse.json(
          { error: "Invalid ABN format. Must be 11 digits." },
          { status: 400 }
        )
      }
    }

    const userEmail = (session.user as any).email as string
    const existingProvider = await prisma.marketplaceProvider.findFirst({
      where: { email: userEmail },
    })

    if (existingProvider) {
      return NextResponse.json(
        { error: "User already has a provider profile" },
        { status: 409 }
      )
    }

    const provider = await prisma.marketplaceProvider.create({
      data: {
        name,
        businessName: businessName || null,
        abn: abn || null,
        email,
        phone: phone || null,
        website: website || null,
        description: description || null,
        category,
        subcategories: subcategories || [],
        qualifications: qualifications || [],
        location: location || null,
        serviceArea: serviceArea || null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        dailyRate: dailyRate ? parseFloat(dailyRate) : null,
        preferredPayment: preferredPayment || null,
        notes: notes || null,
        status: "ACTIVE",
        verified: false,
        rating: 0,
        reviewCount: 0,
      },
      include: {
        capabilities: true,
      },
    })

    return NextResponse.json(provider, { status: 201 })
  } catch (error) {
    console.error("Error creating provider:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
