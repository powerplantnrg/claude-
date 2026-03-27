/**
 * Matching Engine - Finds and scores providers against requirements,
 * ranks bids, and suggests invitations for marketplace listings.
 */

import { prisma } from "@/lib/prisma"

export interface ProviderMatch {
  providerId: string
  providerName: string
  score: number
  matchDetails: {
    capabilityScore: number
    locationScore: number
    ratingScore: number
    availabilityScore: number
    priceScore: number
  }
}

export interface BidRanking {
  bidId: string
  providerId: string
  score: number
  breakdown: {
    valueScore: number
    ratingScore: number
    timelineScore: number
    paymentTermsScore: number
  }
}

/**
 * Find providers matching a requirement item's skills, equipment, location, and category.
 */
export async function findMatchingProviders(
  requirementItem: {
    category: string
    requiredSkills?: string | null
    requiredEquipment?: string | null
    estimatedBudget?: number | null
  },
  filters?: {
    location?: string
    maxRate?: number
    verifiedOnly?: boolean
    minRating?: number
    serviceArea?: string
  }
): Promise<ProviderMatch[]> {
  // Map requirement categories to provider categories
  const categoryMap: Record<string, string[]> = {
    Researcher: ["Researcher", "TechnicalProfessional"],
    Equipment: ["EquipmentLeasing", "PlantHire"],
    Facility: ["FacilityProvider"],
    Consultant: ["Consultant"],
    TaxAgent: ["TaxAgent"],
    Laborer: ["Laborer"],
    Technical: ["TechnicalProfessional", "Consultant"],
    Trade: ["Tradesperson"],
    LabService: ["LabService"],
    Other: [],
  }

  const targetCategories = categoryMap[requirementItem.category] ?? []

  const whereClause: Record<string, unknown> = {
    status: "Active",
  }

  if (targetCategories.length > 0) {
    whereClause.category = { in: targetCategories }
  }

  if (filters?.verifiedOnly) {
    whereClause.verified = true
  }

  if (filters?.minRating) {
    whereClause.rating = { gte: filters.minRating }
  }

  const providers = await prisma.marketplaceProvider.findMany({
    where: whereClause,
    include: {
      capabilities: true,
    },
  })

  const scored: ProviderMatch[] = providers.map((provider) => {
    const details = scoreProviderMatch(
      {
        category: provider.category,
        location: provider.location,
        serviceArea: provider.serviceArea,
        rating: provider.rating,
        hourlyRate: provider.hourlyRate,
        dailyRate: provider.dailyRate,
        availableFrom: provider.availableFrom,
        capabilities: provider.capabilities.map((c) => ({
          capabilityType: c.capabilityType,
          name: c.name,
        })),
      },
      {
        category: requirementItem.category,
        requiredSkills: requirementItem.requiredSkills,
        requiredEquipment: requirementItem.requiredEquipment,
        estimatedBudget: requirementItem.estimatedBudget,
        location: filters?.location,
      }
    )

    return {
      providerId: provider.id,
      providerName: provider.name,
      score: details.capabilityScore * 0.35 +
             details.locationScore * 0.15 +
             details.ratingScore * 0.20 +
             details.availabilityScore * 0.10 +
             details.priceScore * 0.20,
      matchDetails: details,
    }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored
}

/**
 * Score a provider against a requirement on a 0-100 scale across multiple dimensions.
 */
export function scoreProviderMatch(
  provider: {
    category: string
    location?: string | null
    serviceArea?: string | null
    rating: number
    hourlyRate?: number | null
    dailyRate?: number | null
    availableFrom?: Date | null
    capabilities: Array<{ capabilityType: string; name: string }>
  },
  requirement: {
    category: string
    requiredSkills?: string | null
    requiredEquipment?: string | null
    estimatedBudget?: number | null
    location?: string | null
  }
): {
  capabilityScore: number
  locationScore: number
  ratingScore: number
  availabilityScore: number
  priceScore: number
} {
  // Capability score: how well do provider capabilities match required skills/equipment
  let capabilityScore = 50 // base score for category match

  if (requirement.requiredSkills) {
    const requiredSkills = requirement.requiredSkills.split(",").map((s) => s.trim().toLowerCase())
    const providerSkills = provider.capabilities
      .filter((c) => c.capabilityType === "Skill" || c.capabilityType === "Certification")
      .map((c) => c.name.toLowerCase())

    const matchedSkills = requiredSkills.filter((rs) =>
      providerSkills.some((ps) => ps.includes(rs) || rs.includes(ps))
    )
    const skillMatch = requiredSkills.length > 0 ? matchedSkills.length / requiredSkills.length : 0
    capabilityScore = 50 + skillMatch * 50
  }

  if (requirement.requiredEquipment) {
    const requiredEquip = requirement.requiredEquipment.split(",").map((s) => s.trim().toLowerCase())
    const providerEquip = provider.capabilities
      .filter((c) => c.capabilityType === "Equipment" || c.capabilityType === "Facility")
      .map((c) => c.name.toLowerCase())

    const matchedEquip = requiredEquip.filter((re) =>
      providerEquip.some((pe) => pe.includes(re) || re.includes(pe))
    )
    const equipMatch = requiredEquip.length > 0 ? matchedEquip.length / requiredEquip.length : 0
    capabilityScore = Math.max(capabilityScore, 50 + equipMatch * 50)
  }

  // Location score
  let locationScore = 70 // default if no location preference
  if (requirement.location && provider.serviceArea) {
    const serviceAreas = provider.serviceArea.split(",").map((s) => s.trim().toLowerCase())
    const reqLocation = requirement.location.toLowerCase()
    if (serviceAreas.some((area) => reqLocation.includes(area) || area.includes(reqLocation))) {
      locationScore = 100
    } else {
      locationScore = 30
    }
  } else if (requirement.location && provider.location) {
    locationScore = provider.location.toLowerCase().includes(requirement.location.toLowerCase()) ? 100 : 40
  }

  // Rating score: normalize 0-5 rating to 0-100
  const ratingScore = Math.min(100, provider.rating * 20)

  // Availability score: available now = 100, available soon = 80, etc.
  let availabilityScore = 60
  if (provider.availableFrom) {
    const now = new Date()
    const daysUntilAvailable = Math.max(0, (provider.availableFrom.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilAvailable === 0) availabilityScore = 100
    else if (daysUntilAvailable <= 7) availabilityScore = 90
    else if (daysUntilAvailable <= 30) availabilityScore = 70
    else availabilityScore = 40
  }

  // Price score: lower rate relative to budget = higher score
  let priceScore = 60 // default if no budget info
  if (requirement.estimatedBudget && provider.dailyRate) {
    const budgetRatio = provider.dailyRate / (requirement.estimatedBudget / 20) // assume 20 working days
    if (budgetRatio <= 0.8) priceScore = 100
    else if (budgetRatio <= 1.0) priceScore = 80
    else if (budgetRatio <= 1.2) priceScore = 60
    else priceScore = 30
  }

  return {
    capabilityScore: Math.round(capabilityScore),
    locationScore: Math.round(locationScore),
    ratingScore: Math.round(ratingScore),
    availabilityScore: Math.round(availabilityScore),
    priceScore: Math.round(priceScore),
  }
}

/**
 * Rank bids for a listing by value, provider rating, timeline, and payment terms.
 */
export async function rankBids(
  bids: Array<{
    id: string
    providerId: string
    amount: number
    rateType?: string | null
    proposedStartDate?: Date | null
    proposedEndDate?: Date | null
    paymentPreference?: string | null
    provider: {
      rating: number
      reviewCount: number
    }
  }>
): Promise<BidRanking[]> {
  if (bids.length === 0) return []

  // Find the median amount for relative scoring
  const amounts = bids.map((b) => b.amount).sort((a, b) => a - b)
  const medianAmount = amounts[Math.floor(amounts.length / 2)]

  const rankings: BidRanking[] = bids.map((bid) => {
    // Value score: lower amount = higher score (relative to median)
    const priceRatio = medianAmount > 0 ? bid.amount / medianAmount : 1
    let valueScore = 50
    if (priceRatio <= 0.8) valueScore = 95
    else if (priceRatio <= 0.95) valueScore = 85
    else if (priceRatio <= 1.05) valueScore = 70
    else if (priceRatio <= 1.2) valueScore = 50
    else valueScore = 30

    // Rating score
    const ratingScore = Math.min(100, bid.provider.rating * 20)

    // Timeline score: earlier start = higher score
    let timelineScore = 60
    if (bid.proposedStartDate) {
      const now = new Date()
      const daysUntilStart = Math.max(0, (bid.proposedStartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilStart <= 7) timelineScore = 100
      else if (daysUntilStart <= 14) timelineScore = 85
      else if (daysUntilStart <= 30) timelineScore = 70
      else timelineScore = 45
    }

    // Payment terms: standard preferred over financing (lower risk)
    let paymentTermsScore = 70
    if (bid.paymentPreference === "Standard") paymentTermsScore = 90
    else if (bid.paymentPreference === "Milestone") paymentTermsScore = 80
    else if (bid.paymentPreference === "QuarterlyFinancing") paymentTermsScore = 60

    const totalScore =
      valueScore * 0.35 +
      ratingScore * 0.25 +
      timelineScore * 0.20 +
      paymentTermsScore * 0.20

    return {
      bidId: bid.id,
      providerId: bid.providerId,
      score: Math.round(totalScore),
      breakdown: {
        valueScore: Math.round(valueScore),
        ratingScore: Math.round(ratingScore),
        timelineScore: Math.round(timelineScore),
        paymentTermsScore: Math.round(paymentTermsScore),
      },
    }
  })

  rankings.sort((a, b) => b.score - a.score)
  return rankings
}

/**
 * Suggest providers to invite based on past contracts, capabilities, and listing requirements.
 */
export async function suggestInvitations(listing: {
  category?: string | null
  location?: string | null
  budget?: number | null
  organizationId: string
}): Promise<Array<{ providerId: string; providerName: string; reason: string }>> {
  const suggestions: Array<{ providerId: string; providerName: string; reason: string }> = []

  // Find providers who have completed contracts with this organization
  const pastContracts = await prisma.marketplaceContract.findMany({
    where: {
      organizationId: listing.organizationId,
      status: "Completed",
    },
    include: {
      provider: true,
      reviews: true,
    },
  })

  for (const contract of pastContracts) {
    const avgRating = contract.reviews.length > 0
      ? contract.reviews.reduce((sum, r) => sum + r.rating, 0) / contract.reviews.length
      : 0

    if (avgRating >= 4 && contract.provider.status === "Active") {
      suggestions.push({
        providerId: contract.provider.id,
        providerName: contract.provider.name,
        reason: `Previously completed contract with ${avgRating.toFixed(1)}-star rating`,
      })
    }
  }

  // Find top-rated providers in the matching category
  if (listing.category) {
    const topProviders = await prisma.marketplaceProvider.findMany({
      where: {
        status: "Active",
        category: listing.category,
        rating: { gte: 4 },
        id: { notIn: suggestions.map((s) => s.providerId) },
      },
      orderBy: { rating: "desc" },
      take: 5,
    })

    for (const provider of topProviders) {
      suggestions.push({
        providerId: provider.id,
        providerName: provider.name,
        reason: `Top-rated ${provider.category} (${provider.rating.toFixed(1)} stars, ${provider.reviewCount} reviews)`,
      })
    }
  }

  return suggestions.slice(0, 10)
}
