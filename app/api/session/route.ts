import { type NextRequest, NextResponse } from "next/server"

// In-memory storage (replace with database in production)
const sessions: Record<string, any> = {}
const globalReviewed: string[] = []

interface Session {
  userId: string
  userName: string
  currentBatch: string[]
  currentIndex: number
  completedImages: string[]
  feedback: any[]
  createdAt: string
  lastActive: string
}

export async function POST(request: NextRequest) {
  try {
    const { userName } = await request.json()

    if (!userName || userName.trim().length === 0) {
      return NextResponse.json({ error: "User name is required" }, { status: 400 })
    }

    const userId = userName.toLowerCase().replace(/[^a-z0-9]/g, "_")
    let session = sessions[userId]

    if (!session) {
      // Create new session
      session = {
        userId,
        userName: userName.trim(),
        currentBatch: [],
        currentIndex: 0,
        completedImages: [],
        feedback: [],
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      }
    } else {
      // Update last active
      session.lastActive = new Date().toISOString()
    }

    sessions[userId] = session

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Session API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const session = sessions[userId]

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Session GET API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
