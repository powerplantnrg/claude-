/**
 * Requirement Extractor - Analyzes design documents and project context
 * to extract anticipated specialist marketplace needs.
 */

// Category keywords for matching requirement text to provider categories
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Researcher: [
    "research", "scientist", "phd", "laboratory", "experiment", "hypothesis",
    "analysis", "study", "investigation", "r&d", "clinical", "trial",
  ],
  Consultant: [
    "consultant", "advisor", "advisory", "strategy", "management", "expert",
    "specialist", "review", "assessment", "evaluation",
  ],
  Equipment: [
    "equipment", "instrument", "machine", "device", "tool", "apparatus",
    "hardware", "sensor", "meter", "analyser", "analyzer",
  ],
  Facility: [
    "facility", "lab", "laboratory", "workspace", "cleanroom", "workshop",
    "testing facility", "manufacturing", "production line",
  ],
  TaxAgent: [
    "tax", "r&d tax", "incentive", "offset", "compliance", "ato",
    "tax agent", "accountant", "audit",
  ],
  Laborer: [
    "laborer", "labourer", "worker", "technician", "operator", "installer",
    "assembly", "manual", "construction",
  ],
  Technical: [
    "engineer", "engineering", "developer", "software", "firmware",
    "electrical", "mechanical", "design", "cad", "simulation",
  ],
  Trade: [
    "electrician", "plumber", "welder", "fabrication", "machinist",
    "carpenter", "tradesperson", "fitter", "boilermaker",
  ],
  LabService: [
    "testing service", "lab service", "calibration", "certification",
    "accreditation", "sample analysis", "nata",
  ],
  EquipmentLeasing: [
    "lease", "leasing", "rental", "hire", "plant hire", "equipment hire",
  ],
  Other: [],
}

// Cost benchmarks by category (AUD per unit)
const COST_BENCHMARKS: Record<string, { hourly: number; daily: number; weekly: number }> = {
  Researcher:    { hourly: 120, daily: 900, weekly: 4200 },
  Consultant:    { hourly: 200, daily: 1500, weekly: 7000 },
  Equipment:     { hourly: 50,  daily: 350, weekly: 1500 },
  Facility:      { hourly: 80,  daily: 600, weekly: 2800 },
  TaxAgent:      { hourly: 250, daily: 1800, weekly: 8500 },
  Laborer:       { hourly: 55,  daily: 420, weekly: 2000 },
  Technical:     { hourly: 150, daily: 1100, weekly: 5200 },
  Trade:         { hourly: 90,  daily: 680, weekly: 3200 },
  LabService:    { hourly: 100, daily: 750, weekly: 3500 },
  EquipmentLeasing: { hourly: 60, daily: 450, weekly: 2000 },
  Other:         { hourly: 100, daily: 750, weekly: 3500 },
}

// Location multipliers for cost estimation
const LOCATION_MULTIPLIERS: Record<string, number> = {
  Sydney: 1.15,
  Melbourne: 1.10,
  Brisbane: 1.05,
  Perth: 1.10,
  Adelaide: 1.0,
  Canberra: 1.08,
  Hobart: 0.95,
  Darwin: 1.20,
  Regional: 0.90,
}

export interface RequirementSuggestionItem {
  itemTitle: string
  itemDescription: string
  category: string
  quantity: number | null
  unitType: string | null
  duration: string | null
  estimatedCost: number | null
  rationale: string
  alternativeDescription: string | null
  confidence: number
}

/**
 * Analyze design document text and extract anticipated specialist needs:
 * researchers, equipment, facilities, services, timelines, quantities.
 */
export function extractRequirementsFromDesign(
  designText: string,
  projectContext: {
    projectName?: string
    budget?: number
    startDate?: string
    endDate?: string
    industry?: string
  }
): RequirementSuggestionItem[] {
  const suggestions: RequirementSuggestionItem[] = []
  const lowerText = designText.toLowerCase()

  // Extract research / scientific personnel needs
  if (matchesKeywords(lowerText, CATEGORY_KEYWORDS.Researcher)) {
    suggestions.push({
      itemTitle: "Research Scientist",
      itemDescription: `Research personnel for ${projectContext.projectName ?? "project"} R&D activities`,
      category: "Researcher",
      quantity: estimateQuantityFromText(lowerText, "researcher"),
      unitType: "Days",
      duration: estimateDurationFromText(lowerText) ?? "12 weeks",
      estimatedCost: null,
      rationale: "Design document references research activities requiring specialist researchers",
      alternativeDescription: "Consider engaging a university research partner for lower rates",
      confidence: calculateConfidence(lowerText, CATEGORY_KEYWORDS.Researcher),
    })
  }

  // Extract equipment needs
  if (matchesKeywords(lowerText, CATEGORY_KEYWORDS.Equipment)) {
    const equipmentItems = extractSpecificItems(lowerText, CATEGORY_KEYWORDS.Equipment)
    suggestions.push({
      itemTitle: "Specialist Equipment",
      itemDescription: `Equipment required: ${equipmentItems.length > 0 ? equipmentItems.join(", ") : "as specified in design"}`,
      category: "Equipment",
      quantity: 1,
      unitType: "Units",
      duration: null,
      estimatedCost: null,
      rationale: "Design document references equipment or instrumentation needs",
      alternativeDescription: "Consider leasing vs purchasing; check existing inventory first",
      confidence: calculateConfidence(lowerText, CATEGORY_KEYWORDS.Equipment),
    })
  }

  // Extract facility needs
  if (matchesKeywords(lowerText, CATEGORY_KEYWORDS.Facility)) {
    suggestions.push({
      itemTitle: "Facility Access",
      itemDescription: `Facility or lab space for ${projectContext.projectName ?? "project"} activities`,
      category: "Facility",
      quantity: 1,
      unitType: "Months",
      duration: estimateDurationFromText(lowerText) ?? "6 months",
      estimatedCost: null,
      rationale: "Design document references facility or laboratory requirements",
      alternativeDescription: "Check university or co-working lab space for cost-effective options",
      confidence: calculateConfidence(lowerText, CATEGORY_KEYWORDS.Facility),
    })
  }

  // Extract consulting needs
  if (matchesKeywords(lowerText, CATEGORY_KEYWORDS.Consultant)) {
    suggestions.push({
      itemTitle: "Specialist Consultant",
      itemDescription: `Expert advisory services for ${projectContext.projectName ?? "project"}`,
      category: "Consultant",
      quantity: 1,
      unitType: "Days",
      duration: "4 weeks",
      estimatedCost: null,
      rationale: "Design document indicates need for expert consultation or advisory",
      alternativeDescription: "Consider retainer vs fixed-scope engagement",
      confidence: calculateConfidence(lowerText, CATEGORY_KEYWORDS.Consultant),
    })
  }

  // Extract tax / compliance needs
  if (matchesKeywords(lowerText, CATEGORY_KEYWORDS.TaxAgent)) {
    suggestions.push({
      itemTitle: "R&D Tax Agent",
      itemDescription: "R&D tax incentive registration and compliance services",
      category: "TaxAgent",
      quantity: 1,
      unitType: "Units",
      duration: null,
      estimatedCost: null,
      rationale: "Project may be eligible for R&D tax incentive; specialist agent recommended",
      alternativeDescription: "Some accounting firms offer bundled R&D tax and audit services",
      confidence: 0.7,
    })
  }

  // Extract lab service needs
  if (matchesKeywords(lowerText, CATEGORY_KEYWORDS.LabService)) {
    suggestions.push({
      itemTitle: "Laboratory Testing Service",
      itemDescription: "External lab testing, calibration, or certification services",
      category: "LabService",
      quantity: 1,
      unitType: "Units",
      duration: null,
      estimatedCost: null,
      rationale: "Design document references testing, calibration, or lab services",
      alternativeDescription: "NATA-accredited labs may be required for compliance",
      confidence: calculateConfidence(lowerText, CATEGORY_KEYWORDS.LabService),
    })
  }

  // Extract technical / engineering needs
  if (matchesKeywords(lowerText, CATEGORY_KEYWORDS.Technical)) {
    suggestions.push({
      itemTitle: "Technical Professional",
      itemDescription: `Engineering or technical specialist for ${projectContext.projectName ?? "project"}`,
      category: "Technical",
      quantity: estimateQuantityFromText(lowerText, "engineer"),
      unitType: "Days",
      duration: estimateDurationFromText(lowerText) ?? "8 weeks",
      estimatedCost: null,
      rationale: "Design document references engineering or technical development work",
      alternativeDescription: "Consider contract-to-hire if long-term need is anticipated",
      confidence: calculateConfidence(lowerText, CATEGORY_KEYWORDS.Technical),
    })
  }

  // Extract trade needs
  if (matchesKeywords(lowerText, CATEGORY_KEYWORDS.Trade)) {
    suggestions.push({
      itemTitle: "Tradesperson",
      itemDescription: "Skilled trade services (fabrication, electrical, mechanical)",
      category: "Trade",
      quantity: 1,
      unitType: "Days",
      duration: "2 weeks",
      estimatedCost: null,
      rationale: "Design document references fabrication, installation, or trade work",
      alternativeDescription: null,
      confidence: calculateConfidence(lowerText, CATEGORY_KEYWORDS.Trade),
    })
  }

  // Fill in cost estimates
  for (const s of suggestions) {
    if (s.estimatedCost === null && s.quantity && s.unitType) {
      s.estimatedCost = estimateCost(
        s.category,
        s.quantity,
        s.duration ?? "1 week",
        projectContext.industry ?? "General"
      )
    }
  }

  return suggestions
}

/**
 * Map a requirement description to the most likely provider categories.
 */
export function suggestProviderCategories(requirementDescription: string): string[] {
  const lower = requirementDescription.toLowerCase()
  const matches: Array<{ category: string; score: number }> = []

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "Other") continue
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0)
    if (score > 0) {
      matches.push({ category, score })
    }
  }

  matches.sort((a, b) => b.score - a.score)

  if (matches.length === 0) {
    return ["Other"]
  }

  return matches.slice(0, 3).map((m) => m.category)
}

/**
 * Rough cost estimation based on category benchmarks.
 */
export function estimateCost(
  category: string,
  quantity: number,
  duration: string,
  location: string
): number {
  const benchmark = COST_BENCHMARKS[category] ?? COST_BENCHMARKS.Other
  const durationWeeks = parseDurationToWeeks(duration)
  const locationMultiplier = LOCATION_MULTIPLIERS[location] ?? 1.0

  // Use daily rate as base, multiply by working days in duration
  const workingDays = durationWeeks * 5
  const baseCost = benchmark.daily * workingDays * quantity

  return Math.round(baseCost * locationMultiplier)
}

/**
 * Generate alternative approaches for a requirement item.
 */
export function generateAlternatives(item: {
  category: string
  title: string
  description?: string
  estimatedBudget?: number
}): Array<{ description: string; estimatedSaving: string; tradeoff: string }> {
  const alternatives: Array<{ description: string; estimatedSaving: string; tradeoff: string }> = []

  switch (item.category) {
    case "Equipment":
      alternatives.push(
        {
          description: "Lease equipment instead of purchasing",
          estimatedSaving: "40-60% upfront cost reduction",
          tradeoff: "Higher long-term cost; no ownership",
        },
        {
          description: "Purchase refurbished/certified pre-owned",
          estimatedSaving: "20-40% cost reduction",
          tradeoff: "May have shorter warranty; limited availability",
        },
        {
          description: "Share equipment with university or research partner",
          estimatedSaving: "50-70% cost reduction",
          tradeoff: "Scheduling constraints; requires partnership agreement",
        }
      )
      break

    case "Researcher":
    case "Technical":
    case "Consultant":
      alternatives.push(
        {
          description: "Engage part-time or fractional specialist",
          estimatedSaving: "30-50% cost reduction",
          tradeoff: "Reduced availability; longer project timeline",
        },
        {
          description: "University research collaboration (PhD students, postdocs)",
          estimatedSaving: "40-60% cost reduction",
          tradeoff: "Slower delivery; IP sharing considerations",
        },
        {
          description: "Remote/offshore specialist engagement",
          estimatedSaving: "20-40% cost reduction",
          tradeoff: "Timezone differences; communication overhead",
        }
      )
      break

    case "Facility":
      alternatives.push(
        {
          description: "Use shared coworking lab / maker space",
          estimatedSaving: "30-50% cost reduction",
          tradeoff: "Limited customisation; shared access",
        },
        {
          description: "University facility access agreement",
          estimatedSaving: "40-60% cost reduction",
          tradeoff: "Access restrictions; may require joint publication",
        }
      )
      break

    case "LabService":
      alternatives.push(
        {
          description: "Batch testing to reduce per-sample costs",
          estimatedSaving: "15-25% cost reduction",
          tradeoff: "Longer turnaround; requires coordination",
        },
        {
          description: "Use interstate lab with lower rates",
          estimatedSaving: "10-20% cost reduction",
          tradeoff: "Shipping time and costs; sample handling risk",
        }
      )
      break

    default:
      alternatives.push({
        description: "Request multiple competitive quotes",
        estimatedSaving: "10-20% potential savings",
        tradeoff: "Additional time for procurement process",
      })
  }

  return alternatives
}

/**
 * Generate a human-readable summary of all requirements.
 */
export function buildRequirementSummary(
  requirements: Array<{
    itemTitle: string
    category: string
    quantity?: number | null
    unitType?: string | null
    duration?: string | null
    estimatedCost?: number | null
  }>
): string {
  if (requirements.length === 0) {
    return "No requirements identified."
  }

  const lines: string[] = [
    `## Requirements Summary`,
    `**Total items:** ${requirements.length}`,
    "",
  ]

  // Group by category
  const byCategory = new Map<string, typeof requirements>()
  for (const r of requirements) {
    const cat = r.category ?? "Other"
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(r)
  }

  let totalEstimatedCost = 0

  for (const [category, items] of byCategory) {
    lines.push(`### ${category}`)
    for (const item of items) {
      const parts: string[] = [`- **${item.itemTitle}**`]
      if (item.quantity && item.unitType) {
        parts.push(`${item.quantity} ${item.unitType}`)
      }
      if (item.duration) {
        parts.push(`Duration: ${item.duration}`)
      }
      if (item.estimatedCost) {
        parts.push(`Est. $${item.estimatedCost.toLocaleString("en-AU")} AUD`)
        totalEstimatedCost += item.estimatedCost
      }
      lines.push(parts.join(" | "))
    }
    lines.push("")
  }

  if (totalEstimatedCost > 0) {
    lines.push(`**Total Estimated Cost:** $${totalEstimatedCost.toLocaleString("en-AU")} AUD`)
  }

  return lines.join("\n")
}

// ---- Internal helpers ----

function matchesKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw))
}

function calculateConfidence(text: string, keywords: string[]): number {
  const matchCount = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0)
  return Math.min(0.95, 0.3 + matchCount * 0.15)
}

function estimateQuantityFromText(text: string, role: string): number {
  // Look for patterns like "2 researchers" or "3 engineers"
  const pattern = new RegExp(`(\\d+)\\s*${role}`, "i")
  const match = text.match(pattern)
  if (match) return parseInt(match[1], 10)
  return 1
}

function estimateDurationFromText(text: string): string | null {
  // Look for duration patterns like "12 weeks", "6 months", "3 months"
  const weekMatch = text.match(/(\d+)\s*weeks?/i)
  if (weekMatch) return `${weekMatch[1]} weeks`

  const monthMatch = text.match(/(\d+)\s*months?/i)
  if (monthMatch) return `${monthMatch[1]} months`

  return null
}

function extractSpecificItems(text: string, keywords: string[]): string[] {
  const items: string[] = []
  for (const kw of keywords) {
    if (text.includes(kw) && !["equipment", "instrument", "machine", "device", "tool", "apparatus", "hardware"].includes(kw)) {
      items.push(kw)
    }
  }
  return items
}

function parseDurationToWeeks(duration: string): number {
  const weekMatch = duration.match(/(\d+)\s*weeks?/i)
  if (weekMatch) return parseInt(weekMatch[1], 10)

  const monthMatch = duration.match(/(\d+)\s*months?/i)
  if (monthMatch) return parseInt(monthMatch[1], 10) * 4.33

  const dayMatch = duration.match(/(\d+)\s*days?/i)
  if (dayMatch) return parseInt(dayMatch[1], 10) / 5

  return 1
}
