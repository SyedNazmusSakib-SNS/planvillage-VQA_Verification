import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json")
const GLOBAL_REVIEWED_FILE = path.join(DATA_DIR, "global_reviewed.json")

interface QAPair {
  image_id: string
  question_type: string
  question: string
  answer: string
  image_path: string
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

async function loadQAPairs(): Promise<QAPair[]> {
  try {
    const csvPath = path.join(process.cwd(), "public", "expert_validation_set.csv")
    const csvText = fs.readFileSync(csvPath, "utf8")

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          result.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }

      result.push(current.trim())
      return result
    }

    const lines = csvText.split("\n").slice(1) // Skip header

    const parsedData: QAPair[] = lines
      .filter((line) => line.trim())
      .map((line) => {
        const [image_id, question_type, question, answer, image_path] = parseCSVLine(line)
        return {
          image_id: image_id || "",
          question_type: question_type || "",
          question: question || "",
          answer: answer || "",
          image_path: image_path || "",
        }
      })
      .filter((item) => item.image_id && item.image_path)

    return parsedData
  } catch (error) {
    console.error("Error loading QA pairs:", error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const sessions = loadSessions()
    const session = sessions[userId]

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Load all QA pairs
    const allQAPairs = await loadQAPairs()

    // Load globally reviewed images
    const globalReviewed = loadGlobalReviewed()

    // Filter out already reviewed images (globally and by this user)
    const availableImages = allQAPairs.filter(
      (qa) => !globalReviewed.includes(qa.image_id) && !session.completedImages.includes(qa.image_id),
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
    session.currentBatch = newBatch.map((qa) => qa.image_id)
    session.currentIndex = 0
    session.feedback = []
    session.lastActive = new Date().toISOString()

    sessions[userId] = session
    saveSessions(sessions)

    return NextResponse.json({
      batch: newBatch,
      session,
    })
  } catch (error) {
    console.error("Batch API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
