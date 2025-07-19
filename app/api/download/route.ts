import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const FEEDBACK_DIR = path.join(process.cwd(), "data", "feedback")

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const fileName = url.searchParams.get("file")

    if (!fileName) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 })
    }

    const filePath = path.join(FEEDBACK_DIR, fileName)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const fileContent = fs.readFileSync(filePath, "utf8")

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Download API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
