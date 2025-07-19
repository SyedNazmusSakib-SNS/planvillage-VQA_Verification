import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json")

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

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

function loadSessions(): Record<string, Session> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, "utf8")
      return JSON.parse(data)
    }
  } catch (error) {
    console.error("Error loading sessions:", error)
  }
  return {}
}

function saveSessions(sessions: Record<string, Session>) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
  } catch (error) {
    console.error("Error saving sessions:", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userName } = await request.json()

    if (!userName || userName.trim().length === 0) {
      return NextResponse.json({ error: "User name is required" }, { status: 400 })
    }

    const sessions = loadSessions()
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
    saveSessions(sessions)

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

    const sessions = loadSessions()
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
