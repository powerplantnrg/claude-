"use client"

import { useState } from "react"
import Link from "next/link"

interface Question {
  id: string
  text: string
  options: string[]
}

const questions: Question[] = [
  {
    id: "new_knowledge",
    text: "Does this activity involve generating new knowledge?",
    options: ["Yes", "No", "Unsure"],
  },
  {
    id: "technical_uncertainty",
    text: "Is there a technical uncertainty that cannot be resolved by a competent professional?",
    options: ["Yes", "No", "Unsure"],
  },
  {
    id: "systematic_progression",
    text: "Does the activity follow a systematic progression from hypothesis to experiment?",
    options: ["Yes", "No", "Unsure"],
  },
  {
    id: "purpose",
    text: "Is the purpose to develop new or improved materials, devices, products, or processes?",
    options: ["Yes", "No", "Unsure"],
  },
  {
    id: "knowledge_generation",
    text: "Is this activity conducted for the purpose of generating new knowledge?",
    options: ["Yes", "No", "Unsure"],
  },
  {
    id: "activity_type",
    text: "Would you classify this as Core R&D or Supporting an existing Core activity?",
    options: ["Core", "Supporting", "Unsure"],
  },
]

type AssessmentResult = "eligible" | "possibly_eligible" | "unlikely_eligible"

function evaluateAnswers(
  answers: Record<string, string>
): { result: AssessmentResult; explanation: string } {
  const yesCount = Object.values(answers).filter((a) => a === "Yes" || a === "Core").length
  const noCount = Object.values(answers).filter((a) => a === "No").length
  const unsureCount = Object.values(answers).filter((a) => a === "Unsure" || a === "Supporting").length

  if (noCount >= 3) {
    return {
      result: "unlikely_eligible",
      explanation:
        "Based on your responses, this activity is unlikely to qualify as eligible R&D under the R&D Tax Incentive. Multiple answers suggest the activity does not meet the core requirements of generating new knowledge, addressing technical uncertainty, or following a systematic experimental approach. Consider consulting with an R&D tax advisor for a detailed assessment.",
    }
  }

  if (yesCount >= 4 && noCount === 0) {
    return {
      result: "eligible",
      explanation:
        "Based on your responses, this activity is likely eligible for the R&D Tax Incentive. The activity appears to involve generating new knowledge, addresses a technical uncertainty, and follows a systematic approach. Ensure you maintain contemporaneous documentation including hypotheses, experimental procedures, and outcomes to support your claim.",
    }
  }

  return {
    result: "possibly_eligible",
    explanation:
      "Based on your responses, this activity may be eligible for the R&D Tax Incentive but requires further review. Some criteria are met while others need clarification. We recommend documenting the technical uncertainties, methodology, and expected outcomes more clearly. Consider seeking advice from an R&D tax specialist to strengthen the eligibility case.",
  }
}

export default function EligibilityWizardPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [assessment, setAssessment] = useState<{
    result: AssessmentResult
    explanation: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activityId, setActivityId] = useState("")

  const isComplete = currentStep >= questions.length

  function handleAnswer(answer: string) {
    const q = questions[currentStep]
    const newAnswers = { ...answers, [q.id]: answer }
    setAnswers(newAnswers)

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      const result = evaluateAnswers(newAnswers)
      setAssessment(result)
      setCurrentStep(questions.length)
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setAssessment(null)
    }
  }

  function handleReset() {
    setCurrentStep(0)
    setAnswers({})
    setAssessment(null)
    setSaved(false)
    setActivityId("")
  }

  async function handleSave() {
    if (!assessment) return
    setSaving(true)
    try {
      const res = await fetch("/api/rd/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: activityId || undefined,
          answers,
          result: assessment.result,
          explanation: assessment.explanation,
        }),
      })
      if (res.ok) {
        setSaved(true)
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  const resultStyles: Record<AssessmentResult, { bg: string; border: string; text: string; label: string }> = {
    eligible: {
      bg: "bg-green-50",
      border: "border-green-300",
      text: "text-green-800",
      label: "Likely Eligible",
    },
    possibly_eligible: {
      bg: "bg-amber-50",
      border: "border-amber-300",
      text: "text-amber-800",
      label: "Possibly Eligible - Needs Review",
    },
    unlikely_eligible: {
      bg: "bg-red-50",
      border: "border-red-300",
      text: "text-red-800",
      label: "Unlikely Eligible",
    },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          R&D Eligibility Wizard
        </h1>
        <p className="text-sm text-slate-500">
          Answer a series of questions to assess whether an activity qualifies as
          eligible R&D under the R&D Tax Incentive
        </p>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Step {Math.min(currentStep + 1, questions.length)} of{" "}
            {questions.length}
          </span>
          <span>
            {Math.round(
              (Math.min(currentStep, questions.length) / questions.length) * 100
            )}
            % complete
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
            style={{
              width: `${(Math.min(currentStep, questions.length) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question or Result */}
      {!isComplete ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            {questions[currentStep].text}
          </h2>
          <div className="flex flex-wrap gap-3">
            {questions[currentStep].options.map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                className={`rounded-lg border-2 px-6 py-3 text-sm font-medium transition-colors ${
                  answers[questions[currentStep].id] === option
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
            )}
          </div>
        </div>
      ) : assessment ? (
        <div className="space-y-4">
          {/* Result Card */}
          <div
            className={`rounded-xl border-2 ${resultStyles[assessment.result].border} ${resultStyles[assessment.result].bg} p-8`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  assessment.result === "eligible"
                    ? "bg-green-200"
                    : assessment.result === "possibly_eligible"
                      ? "bg-amber-200"
                      : "bg-red-200"
                }`}
              >
                {assessment.result === "eligible" ? (
                  <svg
                    className="h-5 w-5 text-green-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                ) : assessment.result === "possibly_eligible" ? (
                  <svg
                    className="h-5 w-5 text-amber-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-red-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
              <h2
                className={`text-xl font-bold ${resultStyles[assessment.result].text}`}
              >
                {resultStyles[assessment.result].label}
              </h2>
            </div>
            <p className={`text-sm ${resultStyles[assessment.result].text}`}>
              {assessment.explanation}
            </p>
          </div>

          {/* Answers Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Your Answers
            </h3>
            <div className="space-y-2">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600">{q.text}</span>
                  <span
                    className={`font-medium ${
                      answers[q.id] === "Yes" || answers[q.id] === "Core"
                        ? "text-green-600"
                        : answers[q.id] === "No"
                          ? "text-red-600"
                          : "text-amber-600"
                    }`}
                  >
                    {answers[q.id]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Save Assessment */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Save Assessment
            </h3>
            <p className="text-sm text-slate-500 mb-3">
              Optionally link this assessment to an R&D activity by entering the
              activity ID below.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Activity ID (optional)"
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saved ? "Saved" : saving ? "Saving..." : "Save Assessment"}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Start New Assessment
            </button>
            <Link
              href="/rd/recommendations"
              className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100"
            >
              View Recommendations
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
