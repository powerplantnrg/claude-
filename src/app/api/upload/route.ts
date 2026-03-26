import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const UPLOAD_DIR = path.join(process.cwd(), "uploads")

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Ensure uploads directory exists
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const fileName = `${timestamp}_${safeName}`
    const filePath = path.join(UPLOAD_DIR, fileName)

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    return NextResponse.json(
      {
        fileName: file.name,
        fileType: file.type,
        filePath: `/uploads/${fileName}`,
        fileSize: file.size,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
