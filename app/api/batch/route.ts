import { type NextRequest, NextResponse } from "next/server"

// In-memory storage (same as session route)
declare global {
  var sessions: Record<string, any>
  var globalReviewed: string[]
}

// Initialize global variables if they don't exist
if (!global.sessions) global.sessions = {}
if (!global.globalReviewed) global.globalReviewed = []

interface QAPair {
  image_id: string
  question_type: string
  question: string
  answer: string
  image_path: string
}

// Sample data - replace with your actual CSV loading logic
const sampleQAPairs: QAPair[] = [
  {
    image_id: "image_012128.JPG",
    question_type: "Counterfactual Reasoning",
    question: "Which characteristics would be evident in a healthy plant but lacking in this one?",
    answer: "If the plant were healthy, the yellowing, upward curling, and stunting of leaves would be absent.",
    image_path: "image_012128.JPG",
  },
  {
    image_id: "image_055325.JPG",
    question_type: "Counterfactual Reasoning",
    question: "If this specimen achieved perfect health, what visual transformations would happen?",
    answer: "A healthy leaf would be uniformly green and free of the symptoms of disease.",
    image_path: "image_055325.JPG",
  },
  // Add more sample data or load from your CSV
]

// Generate more sample data to reach 100+ items
const generateSampleData = (): QAPair[] => {
  const baseData = sampleQAPairs
  const expandedData: QAPair[] = []

  for (let i = 0; i < 100; i++) {
    const base = baseData[i % baseData.length]
    expandedData.push({
      ...base,
      image_id: `image_${String(i).padStart(6, "0")}.JPG`,
      image_path: `image_${String(i).padStart(6, "0")}.JPG`,
    })
  }

  return expandedData
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const session = global.sessions[userId]

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Load all QA pairs (replace with actual CSV loading)
    const allQAPairs = generateSampleData()

    // Filter out already reviewed images
    const availableImages = allQAPairs.filter(
      (qa) => !global.globalReviewed.includes(qa.image_id) && !session.completedImages.includes(qa.image_id),
    )

    if (availableImages.length < 50) {
      return NextResponse.json(
        {
          error: "Not enough unreviewed images available",
          available: availableImages.length,
        },
        { status: 400 },
      )
    }

    // Create new batch of 50 random images
    const shuffled = [...availableImages].sort(() => Math.random() - 0.5)
    const newBatch = shuffled.slice(0, 50)

    // Update session
    session.currentBatch = newBatch.map((qa: QAPair) => qa.image_id)
    session.currentIndex = 0
    session.feedback = []
    session.lastActive = new Date().toISOString()

    global.sessions[userId] = session

    return NextResponse.json({
      batch: newBatch,
      session,
    })
  } catch (error) {
    console.error("Batch API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
