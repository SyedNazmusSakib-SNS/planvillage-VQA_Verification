"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Download, ArrowLeft, ArrowRight, User } from "lucide-react"

interface QAPair {
  image_id: string
  question_type: string
  question: string
  answer: string
  image_path: string
}

interface Feedback {
  image_id: string
  question: string
  answer: string
  relevance_rating: string
  primary_issues: string[]
}

interface Session {
  userId: string
  userName: string
  currentBatch: string[]
  currentIndex: number
  completedImages: string[]
  feedback: Feedback[]
}

export default function PlantValidation() {
  const [session, setSession] = useState<Session | null>(null)
  const [userName, setUserName] = useState("")
  const [currentBatch, setCurrentBatch] = useState<QAPair[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [currentFeedback, setCurrentFeedback] = useState<Feedback>({
    image_id: "",
    question: "",
    answer: "",
    relevance_rating: "",
    primary_issues: [],
  })
  const [loading, setLoading] = useState(false)
  const [loginMode, setLoginMode] = useState(true)

  useEffect(() => {
    if (currentBatch.length > 0) {
      const current = currentBatch[currentIndex]
      const existingFeedback = feedback.find((f) => f.image_id === current.image_id)

      setCurrentFeedback(
        existingFeedback || {
          image_id: current.image_id,
          question: current.question,
          answer: current.answer,
          relevance_rating: "",
          primary_issues: [],
        },
      )
    }
  }, [currentIndex, currentBatch, feedback])

  const handleLogin = async () => {
    if (!userName.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: userName.trim() }),
      })

      const data = await response.json()
      if (response.ok) {
        setSession(data.session)
        setFeedback(data.session.feedback || [])
        setCurrentIndex(data.session.currentIndex || 0)

        // If user has an active batch, load it
        if (data.session.currentBatch && data.session.currentBatch.length > 0) {
          await loadCurrentBatch(data.session.userId)
        }

        setLoginMode(false)
      } else {
        alert(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      alert("Login failed")
    }
    setLoading(false)
  }

  const loadCurrentBatch = async (userId: string) => {
    // This would need to be implemented to reconstruct the current batch
    // For now, we'll start a new batch if needed
  }

  const startNewBatch = async () => {
    if (!session) return

    setLoading(true)
    try {
      const response = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId }),
      })

      const data = await response.json()
      if (response.ok) {
        setCurrentBatch(data.batch)
        setCurrentIndex(0)
        setFeedback([])
        setSession(data.session)
      } else {
        alert(data.error || "Failed to create new batch")
      }
    } catch (error) {
      console.error("Batch creation error:", error)
      alert("Failed to create new batch")
    }
    setLoading(false)
  }

  const handleRelevanceChange = (value: string) => {
    setCurrentFeedback((prev) => ({
      ...prev,
      relevance_rating: value,
    }))
  }

  const handleIssueChange = (issue: string, checked: boolean) => {
    setCurrentFeedback((prev) => ({
      ...prev,
      primary_issues: checked ? [...prev.primary_issues, issue] : prev.primary_issues.filter((i) => i !== issue),
    }))
  }

  const saveFeedback = async () => {
    const updatedFeedback = [...feedback]
    const existingIndex = updatedFeedback.findIndex((f) => f.image_id === currentFeedback.image_id)

    if (existingIndex >= 0) {
      updatedFeedback[existingIndex] = currentFeedback
    } else {
      updatedFeedback.push(currentFeedback)
    }

    setFeedback(updatedFeedback)

    // Save to backend
    if (session) {
      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.userId,
            feedback: updatedFeedback,
            currentIndex,
          }),
        })
      } catch (error) {
        console.error("Error saving feedback:", error)
      }
    }
  }

  const nextQuestion = async () => {
    await saveFeedback()
    if (currentIndex < currentBatch.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const previousQuestion = async () => {
    await saveFeedback()
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const completeBatch = async () => {
    await saveFeedback()

    if (!session) return

    setLoading(true)
    try {
      const response = await fetch("/api/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId,
          feedback: [...feedback, currentFeedback],
        }),
      })

      const data = await response.json()
      if (response.ok) {
        // Create and download CSV file
        const blob = new Blob([data.csvContent], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `feedback_${session.userName}_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)

        // Reset for new batch
        setCurrentBatch([])
        setCurrentIndex(0)
        setFeedback([])

        alert(`Batch completed! ${data.reviewedCount} total images have been reviewed globally.`)
      } else {
        alert(data.error || "Failed to complete batch")
      }
    } catch (error) {
      console.error("Batch completion error:", error)
      alert("Failed to complete batch")
    }
    setLoading(false)
  }

  // Login screen
  if (loginMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <User className="w-5 h-5" />
              Plant Disease Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="userName">Enter your name to continue:</Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g., Dr. Smith"
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full" disabled={!userName.trim() || loading}>
              {loading ? "Logging in..." : "Start Validation"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // No batch screen
  if (currentBatch.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Welcome, {session?.userName}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">You have completed {session?.completedImages.length || 0} images so far.</p>
            <Button onClick={startNewBatch} className="w-full" disabled={loading}>
              {loading ? "Creating Batch..." : "Start New Batch (50 Questions)"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const current = currentBatch[currentIndex]
  const progress = ((currentIndex + 1) / currentBatch.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold">Plant Disease Validation</h1>
            <span className="text-sm text-gray-600">Welcome, {session?.userName}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-600">Total completed: {session?.completedImages.length || 0}</span>
            <span className="text-sm text-gray-600">
              Question {currentIndex + 1} of {currentBatch.length}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image and Q&A */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Image & Question-Answer Pair</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={`/Images/${current.image_path}`}
                  alt={current.image_id}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=300&width=300&text=Image+Not+Found"
                  }}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{current.question_type}</p>
                  <p className="font-medium text-gray-900 mt-1">{current.question}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Answer</p>
                  <p className="text-gray-700 mt-1">{current.answer}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pathologist Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question 1: Relevance Rating */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  1. How relevant and accurate is this Question-Answer pair to the provided image?
                </Label>
                <RadioGroup
                  value={currentFeedback.relevance_rating}
                  onValueChange={handleRelevanceChange}
                  className="space-y-2"
                >
                    {[
                    { value: "strongly_agree", label: "Strongly Agree" },
                    { value: "agree", label: "Agree" },
                    { value: "neutral", label: "Neither Agree nor Disagree" },
                    { value: "disagree", label: "Disagree" },
                    { value: "strongly_disagree", label: "Strongly Disagree" },
                    ].map((option) => (
                    <div key={option.value} className="flex items-start space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                      <Label htmlFor={option.value} className="text-sm leading-relaxed">
                      {option.label}
                      </Label>
                    </div>
                    ))}
                </RadioGroup>
              </div>

              {/* Question 2: Primary Issues */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  2. What is the primary issue with this QA pair? (Check all that apply)
                </Label>
                <div className="space-y-2">
                  {[
                    "Factual Error in Answer: Incorrect disease/plant information",
                    "Factual Error in Question: Incorrect assumption",
                    "Vague/Ambiguous: Poorly phrased and unclear",
                    "Symptom Not Visible: Discusses invisible symptoms",
                    "Logical Mismatch: Answer doesn't match question",
                  ].map((issue) => (
                    <div key={issue} className="flex items-start space-x-2">
                      <Checkbox
                        id={issue}
                        checked={currentFeedback.primary_issues.includes(issue)}
                        onCheckedChange={(checked) => handleIssueChange(issue, checked as boolean)}
                        className="mt-0.5"
                      />
                      <Label htmlFor={issue} className="text-sm leading-relaxed">
                        {issue}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <Button
            onClick={previousQuestion}
            disabled={currentIndex === 0}
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            {currentIndex === currentBatch.length - 1 ? (
              <Button onClick={completeBatch} className="flex items-center gap-2" disabled={loading}>
                <Download className="w-4 h-4" />
                {loading ? "Completing..." : "Complete & Download"}
              </Button>
            ) : (
              <Button onClick={nextQuestion} className="flex items-center gap-2">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
