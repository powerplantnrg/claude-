"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/toast-store"

interface Template {
  name: string
  description: string
  activities: { name: string; type: string; description: string }[]
}

const TEMPLATES: Template[] = [
  {
    name: "AI/ML Model Development",
    description:
      "End-to-end machine learning model development pipeline including data collection, feature engineering, model training, evaluation, and deployment.",
    activities: [
      { name: "Data Collection & Preprocessing", type: "Supporting", description: "Gather, clean, and preprocess training data for model development" },
      { name: "Feature Engineering & Selection", type: "Core", description: "Develop novel feature representations and selection methods" },
      { name: "Model Architecture Design", type: "Core", description: "Design and iterate on neural network architectures or ML algorithms" },
      { name: "Training & Hyperparameter Optimization", type: "Core", description: "Train models and systematically optimize hyperparameters" },
      { name: "Model Evaluation & Validation", type: "Core", description: "Evaluate model performance against benchmarks and validate results" },
      { name: "Deployment & Monitoring", type: "Supporting", description: "Deploy model to production and set up performance monitoring" },
    ],
  },
  {
    name: "Software Platform R&D",
    description:
      "Research and development for new software platform capabilities, including architecture exploration, prototype development, and performance optimization.",
    activities: [
      { name: "Architecture Research", type: "Core", description: "Investigate novel software architectures and design patterns" },
      { name: "Prototype Development", type: "Core", description: "Build prototypes to test technical feasibility of new approaches" },
      { name: "Performance Optimization Research", type: "Core", description: "Research and experiment with performance improvement techniques" },
      { name: "Security Research", type: "Core", description: "Investigate new security mechanisms and vulnerability mitigation" },
      { name: "Integration Testing", type: "Supporting", description: "Test integration of new components with existing systems" },
      { name: "Technical Documentation", type: "Supporting", description: "Document technical decisions, outcomes, and learnings" },
    ],
  },
  {
    name: "Energy Technology",
    description:
      "Research into renewable energy, energy storage, or energy efficiency technologies including materials research, system design, and field testing.",
    activities: [
      { name: "Materials Research", type: "Core", description: "Investigate new materials for energy generation or storage" },
      { name: "System Design & Simulation", type: "Core", description: "Design energy systems and run computational simulations" },
      { name: "Prototype Fabrication", type: "Core", description: "Build prototype devices or systems for testing" },
      { name: "Performance Testing", type: "Core", description: "Conduct systematic performance testing under controlled conditions" },
      { name: "Field Testing & Validation", type: "Core", description: "Deploy prototypes for real-world field testing" },
      { name: "Regulatory Compliance Research", type: "Supporting", description: "Research regulatory requirements and compliance standards" },
    ],
  },
  {
    name: "Pharmaceutical/Biotech",
    description:
      "Drug discovery and biotechnology research including target identification, compound screening, preclinical studies, and process development.",
    activities: [
      { name: "Target Identification & Validation", type: "Core", description: "Identify and validate therapeutic targets" },
      { name: "Compound Screening & Optimization", type: "Core", description: "Screen compound libraries and optimize lead candidates" },
      { name: "In Vitro Studies", type: "Core", description: "Conduct cell-based and biochemical assays" },
      { name: "In Vivo Studies", type: "Core", description: "Conduct animal model studies for efficacy and safety" },
      { name: "Process Development", type: "Core", description: "Develop manufacturing processes for scale-up" },
      { name: "Analytical Method Development", type: "Supporting", description: "Develop and validate analytical methods for quality control" },
    ],
  },
]

export default function RdTemplatesPage() {
  const router = useRouter()
  const [creating, setCreating] = useState<string | null>(null)

  async function useTemplate(template: Template) {
    setCreating(template.name)
    try {
      const res = await fetch("/api/rd/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: template.name,
          description: template.description,
          activities: template.activities,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create project from template")
      }
      toast.success("Project created from template")
      router.push("/rd/projects")
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create project"
      )
    } finally {
      setCreating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">R&D Project Templates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Start a new R&D project from a pre-configured template with activities
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {TEMPLATES.map((template) => (
          <div
            key={template.name}
            className="rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 p-6">
              <h2 className="text-lg font-semibold text-slate-900">{template.name}</h2>
              <p className="mt-2 text-sm text-slate-500">{template.description}</p>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Activities</h3>
              <ul className="space-y-2">
                {template.activities.map((activity) => (
                  <li key={activity.name} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 shrink-0 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        activity.type === "Core"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {activity.type}
                    </span>
                    <div>
                      <span className="text-sm font-medium text-slate-800">
                        {activity.name}
                      </span>
                      <p className="text-xs text-slate-400">{activity.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => useTemplate(template)}
                disabled={creating !== null}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating === template.name ? "Creating..." : "Use Template"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
