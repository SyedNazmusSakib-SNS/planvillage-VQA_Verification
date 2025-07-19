import { type NextRequest, NextResponse } from "next/server"

// Use global variables for in-memory storage
declare global {
  var sessions: Record<string, any>
  var globalReviewed: string[]
  var allFeedback: any[]
}

if (!global.sessions) global.sessions = {}
if (!global.globalReviewed) global.globalReviewed = []
if (!global.allFeedback) global.allFeedback = []

export async function POST(request: NextRequest) {
  try {
    const { userId, feedback, currentIndex } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const session = global.sessions[userId]

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Update session with current progress
    session.feedback = feedback
    session.currentIndex = currentIndex
    session.lastActive = new Date().toISOString()

    global.sessions[userId] = session

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

    const session = global.sessions[userId]

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Store feedback globally
    global.allFeedback.push({
      userId,
      userName: session.userName,
      feedback,
      timestamp: new Date().toISOString(),
    })

    // Mark images as globally reviewed
    const newReviewedImages = feedback.map((f: any) => f.image_id)
    global.globalReviewed = [...new Set([...global.globalReviewed, ...newReviewedImages])]

    // Update session - mark batch as completed
    session.completedImages = [...new Set([...session.completedImages, ...newReviewedImages])]
    session.currentBatch = []
    session.currentIndex = 0
    session.feedback = []
    session.lastActive = new Date().toISOString()

    global.sessions[userId] = session

    // Generate CSV content
    const csvContent = [
      "image_id,question,answer,relevance_rating,primary_issues",
      ...feedback.map(
        (f: any) =>
          `"${f.image_id}","${f.question}","${f.answer}","${f.relevance_rating}","${f.primary_issues.join("; ")}"`,
      ),
    ].join("\n")

    return NextResponse.json({
      success: true,
      csvContent,
      reviewedCount: global.globalReviewed.length,
    })
  } catch (error) {
    console.error("Feedback complete API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
