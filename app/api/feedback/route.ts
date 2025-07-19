import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json")
const GLOBAL_REVIEWED_FILE = path.join(DATA_DIR, "global_reviewed.json")
const FEEDBACK_DIR = path.join(DATA_DIR, "feedback")

// Ensure feedback directory exists
if (!fs.existsSync(FEEDBACK_DIR)) {
  fs.mkdirSync(FEEDBACK_DIR, { recursive: true })
}

function loadSessions() {
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

function saveSessions(sessions: any) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
  } catch (error) {
    console.error("Error saving sessions:", error)
  }
}

function loadGlobalReviewed(): string[] {
  try {
    if (fs.existsSync(GLOBAL_REVIEWED_FILE)) {
      const data = fs.readFileSync(GLOBAL_REVIEWED_FILE, "utf8")
      return JSON.parse(data)
    }
  } catch (error) {
    console.error("Error loading global reviewed:", error)
  }
  return []
}

function saveGlobalReviewed(reviewed: string[]) {
  try {
    fs.writeFileSync(GLOBAL_REVIEWED_FILE, JSON.stringify(reviewed, null, 2))
  } catch (error) {
    console.error("Error saving global reviewed:", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, feedback, currentIndex } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const sessions = loadSessions()
    const session = sessions[userId]

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Update session with current progress
    session.feedback = feedback
    session.currentIndex = currentIndex
    session.lastActive = new Date().toISOString()

    sessions[userId] = session
    saveSessions(sessions)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Feedback save API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, feedback } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const sessions = loadSessions()
    const session = sessions[userId]

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Save feedback to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const feedbackFileName = `${userId}_${timestamp}.csv`
    const feedbackPath = path.join(FEEDBACK_DIR, feedbackFileName)

    const csvContent = [
      "image_id,question,answer,relevance_rating,primary_issues",
      ...feedback.map(
        (f: any) =>
          `"${f.image_id}","${f.question}","${f.answer}","${f.relevance_rating}","${f.primary_issues.join("; ")}"`,
      ),
    ].join("\n")

    fs.writeFileSync(feedbackPath, csvContent)

    // Mark images as globally reviewed
    const globalReviewed = loadGlobalReviewed()
    const newReviewedImages = feedback.map((f: any) => f.image_id)
    const updatedGlobalReviewed = [...new Set([...globalReviewed, ...newReviewedImages])]
    saveGlobalReviewed(updatedGlobalReviewed)

    // Update session - mark batch as completed
    session.completedImages = [...new Set([...session.completedImages, ...newReviewedImages])]
    session.currentBatch = []
    session.currentIndex = 0
    session.feedback = []
    session.lastActive = new Date().toISOString()

    sessions[userId] = session
    saveSessions(sessions)

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/download?file=${feedbackFileName}`,
      reviewedCount: updatedGlobalReviewed.length,
    })
  } catch (error) {
    console.error("Feedback complete API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
