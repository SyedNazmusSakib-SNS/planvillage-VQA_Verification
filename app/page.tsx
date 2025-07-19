"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Download, ArrowLeft, ArrowRight } from "lucide-react"

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

export default function PlantValidation() {
  const [qaPairs, setQaPairs] = useState<QAPair[]>([])
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
  const [batchNumber, setBatchNumber] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCSVData()
  }, [])

  useEffect(() => {
    if (qaPairs.length > 0) {
      generateNewBatch()
    }
  }, [qaPairs])

  useEffect(() => {
    if (currentBatch.length > 0) {
      const current = currentBatch[currentIndex]
      setCurrentFeedback({
        image_id: current.image_id,
        question: current.question,
        answer: current.answer,
        relevance_rating: "",
        primary_issues: [],
      })
    }
  }, [currentIndex, currentBatch])

  const loadCSVData = async () => {
    try {
      const response = await fetch("/expert_validation_set.csv")
      const csvText = await response.text()

      // Proper CSV parsing function that handles quoted fields
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
        .filter((item) => item.image_id && item.image_path) // Filter out invalid entries

      console.log("Parsed data sample:", parsedData.slice(0, 3)) // Debug log
      setQaPairs(parsedData)
      setLoading(false)
    } catch (error) {
      console.error("Error loading CSV:", error)
      setLoading(false)
    }
  }

  const generateNewBatch = () => {
    const shuffled = [...qaPairs].sort(() => Math.random() - 0.5)
    const batch = shuffled.slice(0, 50)
    setCurrentBatch(batch)
    setCurrentIndex(0)
    setFeedback([])
    setBatchNumber((prev) => prev + 1)
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

  const saveFeedback = () => {
    const updatedFeedback = [...feedback]
    const existingIndex = updatedFeedback.findIndex((f) => f.image_id === currentFeedback.image_id)

    if (existingIndex >= 0) {
      updatedFeedback[existingIndex] = currentFeedback
    } else {
      updatedFeedback.push(currentFeedback)
    }

    setFeedback(updatedFeedback)
  }

  const nextQuestion = () => {
    saveFeedback()
    if (currentIndex < currentBatch.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const previousQuestion = () => {
    saveFeedback()
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const downloadFeedback = () => {
    const csvContent = [
      "image_id,question,answer,relevance_rating,primary_issues",
      ...feedback.map(
        (f) => `"${f.image_id}","${f.question}","${f.answer}","${f.relevance_rating}","${f.primary_issues.join("; ")}"`,
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `feedback_batch_${batchNumber}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const startNewBatch = () => {
    generateNewBatch()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading validation data...</p>
        </div>
      </div>
    )
  }

  if (currentBatch.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Plant Disease Validation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-gray-600">Ready to start validation batch #{batchNumber + 1}</p>
            <Button onClick={generateNewBatch} className="w-full">
              Start New Batch (50 Questions)
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const current = currentBatch[currentIndex]
  const progress = ((currentIndex + 1) / currentBatch.length) * 100
  const existingFeedback = feedback.find((f) => f.image_id === current.image_id)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center mb-2">Plant Disease Validation</h1>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-600">Batch #{batchNumber}</span>
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
                  value={existingFeedback?.relevance_rating || currentFeedback.relevance_rating}
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
                        checked={(existingFeedback?.primary_issues || currentFeedback.primary_issues).includes(issue)}
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
              <>
                <Button
                  onClick={() => {
                    saveFeedback()
                    downloadFeedback()
                  }}
                  className="flex items-center gap-2"
                  disabled={feedback.length < currentBatch.length - 1}
                >
                  <Download className="w-4 h-4" />
                  Download Feedback ({feedback.length + 1}/{currentBatch.length})
                </Button>
                <Button onClick={startNewBatch} variant="outline">
                  New Batch
                </Button>
              </>
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
