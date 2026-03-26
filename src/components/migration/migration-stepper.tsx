"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  { key: "Upload", label: "Upload" },
  { key: "Transform", label: "Transform" },
  { key: "Review", label: "Review" },
  { key: "Import", label: "Import" },
  { key: "Reconcile", label: "Reconcile" },
  { key: "Approve", label: "Approve" },
] as const

export type MigrationStep = (typeof STEPS)[number]["key"]

interface MigrationStepperProps {
  currentStep: MigrationStep
  className?: string
}

export function MigrationStepper({ currentStep, className }: MigrationStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep)

  return (
    <div className={cn("w-full", className)}>
      <nav aria-label="Migration progress">
        <ol className="flex items-center">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex
            const isCurrent = idx === currentIndex
            const isLast = idx === STEPS.length - 1

            return (
              <li key={step.key} className={cn("flex items-center", !isLast && "flex-1")}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                      isCompleted && "border-green-500 bg-green-500 text-white",
                      isCurrent && "border-indigo-600 bg-indigo-600 text-white",
                      !isCompleted && !isCurrent && "border-slate-300 bg-white text-slate-400"
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      isCompleted && "text-green-600",
                      isCurrent && "text-indigo-600",
                      !isCompleted && !isCurrent && "text-slate-400"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "mx-2 mt-[-1.25rem] h-0.5 flex-1",
                      isCompleted ? "bg-green-500" : "bg-slate-200"
                    )}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
