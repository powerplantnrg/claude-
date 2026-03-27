import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Rule-based keyword extraction for R&D requirements
const EXTRACTION_RULES = {
  RESEARCHER: {
    keywords: [
      "researcher",
      "scientist",
      "research assistant",
      "postdoc",
      "phd",
      "principal investigator",
      "research fellow",
      "data scientist",
      "analyst",
      "bioinformatician",
      "chemist",
      "physicist",
      "engineer",
      "technician",
      "lab manager",
    ],
    category: "PERSONNEL",
    defaultUnit: "hours",
    defaultDuration: "6 months",
    rateRange: { min: 50, max: 250 },
  },
  EQUIPMENT: {
    keywords: [
      "equipment",
      "instrument",
      "microscope",
      "spectrometer",
      "centrifuge",
      "sequencer",
      "analyzer",
      "sensor",
      "detector",
      "reactor",
      "printer",
      "3d printer",
      "laser",
      "oscilloscope",
      "server",
      "workstation",
      "hardware",
      "machine",
      "apparatus",
    ],
    category: "EQUIPMENT",
    defaultUnit: "units",
    defaultDuration: "one-time",
    rateRange: { min: 1000, max: 100000 },
  },
  FACILITY: {
    keywords: [
      "facility",
      "laboratory",
      "lab space",
      "clean room",
      "workshop",
      "testing facility",
      "data center",
      "office space",
      "co-working",
      "incubator",
      "accelerator",
      "wet lab",
      "dry lab",
      "greenhouse",
      "field station",
    ],
    category: "FACILITY",
    defaultUnit: "months",
    defaultDuration: "12 months",
    rateRange: { min: 500, max: 10000 },
  },
  CONSULTANT: {
    keywords: [
      "consultant",
      "advisor",
      "specialist",
      "expert",
      "contractor",
      "freelancer",
      "mentor",
      "coach",
      "auditor",
      "reviewer",
      "patent attorney",
      "ip specialist",
      "regulatory",
      "compliance",
    ],
    category: "CONSULTANT",
    defaultUnit: "hours",
    defaultDuration: "3 months",
    rateRange: { min: 100, max: 500 },
  },
  SOFTWARE: {
    keywords: [
      "software",
      "license",
      "subscription",
      "platform",
      "tool",
      "saas",
      "cloud service",
      "database",
      "api access",
      "compute",
      "gpu",
      "hosting",
    ],
    category: "SOFTWARE",
    defaultUnit: "licenses",
    defaultDuration: "12 months",
    rateRange: { min: 50, max: 5000 },
  },
  MATERIALS: {
    keywords: [
      "materials",
      "reagents",
      "chemicals",
      "samples",
      "consumables",
      "supplies",
      "raw materials",
      "components",
      "prototyping",
      "fabrication",
    ],
    category: "MATERIALS",
    defaultUnit: "units",
    defaultDuration: "ongoing",
    rateRange: { min: 100, max: 50000 },
  },
}

interface ExtractedItem {
  itemTitle: string
  itemDescription: string
  category: string
  quantity: number
  unitType: string
  duration: string
  estimatedCost: number
  rationale: string
  alternativeDescription: string
  confidence: number
}

function extractRequirements(designText: string): ExtractedItem[] {
  const suggestions: ExtractedItem[] = []
  const textLower = designText.toLowerCase()
  const sentences = designText.split(/[.!?\n]+/).filter((s) => s.trim().length > 10)

  for (const [ruleType, rule] of Object.entries(EXTRACTION_RULES)) {
    for (const keyword of rule.keywords) {
      const keywordLower = keyword.toLowerCase()
      const index = textLower.indexOf(keywordLower)

      if (index === -1) continue

      // Find the sentence containing this keyword
      const matchingSentence = sentences.find((s) =>
        s.toLowerCase().includes(keywordLower)
      )

      if (!matchingSentence) continue

      // Check for duplicates by category + keyword
      const alreadyAdded = suggestions.some(
        (s) =>
          s.category === rule.category &&
          s.itemTitle.toLowerCase().includes(keywordLower)
      )
      if (alreadyAdded) continue

      // Extract quantity hints from surrounding text
      const quantityMatch = matchingSentence.match(
        /(\d+)\s*(?:x\s*)?(?:of\s+)?(?:the\s+)?/i
      )
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1

      // Estimate cost based on category rate range and quantity
      const midRate =
        (rule.rateRange.min + rule.rateRange.max) / 2
      const estimatedCost = midRate * quantity

      // Determine confidence based on specificity of match
      let confidence = 0.6
      if (matchingSentence.toLowerCase().includes("need") ||
          matchingSentence.toLowerCase().includes("require") ||
          matchingSentence.toLowerCase().includes("must have")) {
        confidence = 0.85
      }
      if (quantityMatch) {
        confidence = Math.min(confidence + 0.1, 0.95)
      }

      // Build alternative suggestion
      const alternatives: string[] = []
      if (rule.category === "PERSONNEL") {
        alternatives.push("Consider part-time or contract arrangement")
        alternatives.push("University partnership or student placement")
      } else if (rule.category === "EQUIPMENT") {
        alternatives.push("Equipment hire or shared-use facility")
        alternatives.push("Refurbished or second-hand options")
      } else if (rule.category === "FACILITY") {
        alternatives.push("Shared laboratory space")
        alternatives.push("University or government facility access")
      } else if (rule.category === "CONSULTANT") {
        alternatives.push("Industry advisory board volunteer")
        alternatives.push("Government innovation support programs")
      }

      suggestions.push({
        itemTitle: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} - ${ruleType}`,
        itemDescription: matchingSentence.trim(),
        category: rule.category,
        quantity,
        unitType: rule.defaultUnit,
        duration: rule.defaultDuration,
        estimatedCost,
        rationale: `Identified "${keyword}" in design document context: "${matchingSentence.trim().substring(0, 120)}..."`,
        alternativeDescription: alternatives.join("; "),
        confidence,
      })
    }
  }

  // Sort by confidence descending
  suggestions.sort((a, b) => b.confidence - a.confidence)

  return suggestions
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = (session.user as any).organizationId
    const { id } = await params

    const requirement = await prisma.projectRequirement.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { designText } = body

    if (!designText || typeof designText !== "string") {
      return NextResponse.json(
        { error: "designText is required and must be a string" },
        { status: 400 }
      )
    }

    if (designText.length < 20) {
      return NextResponse.json(
        { error: "designText must be at least 20 characters" },
        { status: 400 }
      )
    }

    // Extract requirements using rule-based system
    const extracted = extractRequirements(designText)

    if (extracted.length === 0) {
      return NextResponse.json({
        message:
          "No specific requirements could be extracted from the provided text. Try including keywords related to personnel, equipment, facilities, consultants, software, or materials.",
        suggestions: [],
      })
    }

    // Create RequirementSuggestion records
    const suggestions = await Promise.all(
      extracted.map((item) =>
        prisma.requirementSuggestion.create({
          data: {
            requirementId: id,
            suggestedByAI: true,
            itemTitle: item.itemTitle,
            itemDescription: item.itemDescription,
            category: item.category,
            quantity: item.quantity,
            unitType: item.unitType,
            duration: item.duration,
            estimatedCost: item.estimatedCost,
            rationale: item.rationale,
            alternativeDescription: item.alternativeDescription,
            confidence: item.confidence,
            accepted: false,
          },
        })
      )
    )

    // Update requirement to indicate extraction source
    await prisma.projectRequirement.update({
      where: { id },
      data: {
        extractedFrom: "DESIGN_DOCUMENT",
        status: requirement.status === "DRAFT" ? "DRAFT" : requirement.status,
      },
    })

    return NextResponse.json({
      message: `Extracted ${suggestions.length} requirement suggestion(s) from the design document`,
      suggestions,
    })
  } catch (error) {
    console.error("Error extracting requirements:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
