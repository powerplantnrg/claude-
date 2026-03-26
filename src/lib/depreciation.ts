/**
 * Fixed Asset Depreciation Engine
 * Australian tax depreciation calculations including R&D asset bonuses
 * and instant asset write-off rules.
 */

interface DepreciationPeriod {
  periodStart: Date;
  periodEnd: Date;
  openingValue: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  closingValue: number;
}

interface AssetForSchedule {
  purchaseDate: Date;
  purchasePrice: number;
  residualValue: number;
  usefulLifeYears: number;
  depreciationMethod: string; // StraightLine | DiminishingValue | UnitsOfProduction
  currentBookValue: number;
}

/**
 * Calculate straight-line depreciation for a given period.
 * @param cost - Original purchase price
 * @param residual - Residual (salvage) value at end of useful life
 * @param usefulLife - Useful life in years
 * @param periodMonths - Number of months in the period (default 1)
 * @returns Monthly depreciation amount for the period
 */
export function calculateStraightLine(
  cost: number,
  residual: number,
  usefulLife: number,
  periodMonths: number = 1
): number {
  if (usefulLife <= 0) return 0;
  const annualDepreciation = (cost - residual) / usefulLife;
  const monthlyDepreciation = annualDepreciation / 12;
  return Math.round(monthlyDepreciation * periodMonths * 100) / 100;
}

/**
 * Calculate diminishing value depreciation (Australian method).
 * Uses the 200% / useful life rate applied to the current book value.
 * @param bookValue - Current book value (written-down value)
 * @param rate - Depreciation rate (if 0, uses 200% / useful life default)
 * @param periodMonths - Number of months in the period (default 1)
 * @returns Depreciation amount for the period
 */
export function calculateDiminishingValue(
  bookValue: number,
  rate: number,
  periodMonths: number = 1
): number {
  if (rate <= 0 || bookValue <= 0) return 0;
  // Australian diminishing value: rate is already annual (200% / useful life)
  const annualDepreciation = bookValue * rate;
  const periodDepreciation = (annualDepreciation / 12) * periodMonths;
  return Math.round(periodDepreciation * 100) / 100;
}

/**
 * Get the Australian diminishing value rate for an asset.
 * Formula: 200% / useful life years
 */
export function getDiminishingValueRate(usefulLifeYears: number): number {
  if (usefulLifeYears <= 0) return 0;
  return 2 / usefulLifeYears;
}

/**
 * Generate a full depreciation schedule from purchase date to end of useful life.
 * Generates monthly periods aligned to calendar months.
 * @param asset - The asset details
 * @returns Array of depreciation periods
 */
export function generateDepreciationSchedule(
  asset: AssetForSchedule
): DepreciationPeriod[] {
  const schedule: DepreciationPeriod[] = [];
  const { purchaseDate, purchasePrice, residualValue, usefulLifeYears, depreciationMethod } = asset;

  if (usefulLifeYears <= 0) return schedule;

  const totalMonths = Math.ceil(usefulLifeYears * 12);
  const depreciableAmount = purchasePrice - residualValue;

  if (depreciableAmount <= 0) return schedule;

  let accumulatedDep = 0;
  let currentBookValue = purchasePrice;

  // Start from the first day of the purchase month
  const startYear = purchaseDate.getFullYear();
  const startMonth = purchaseDate.getMonth();

  // Calculate days in the first month for pro-rata
  const daysInFirstMonth = new Date(startYear, startMonth + 1, 0).getDate();
  const remainingDaysFirstMonth = daysInFirstMonth - purchaseDate.getDate() + 1;
  const firstMonthFraction = remainingDaysFirstMonth / daysInFirstMonth;

  const diminishingRate = depreciationMethod === "DiminishingValue"
    ? getDiminishingValueRate(usefulLifeYears)
    : 0;

  for (let i = 0; i < totalMonths; i++) {
    const periodYear = startYear + Math.floor((startMonth + i) / 12);
    const periodMonth = (startMonth + i) % 12;

    const periodStart = i === 0
      ? new Date(purchaseDate)
      : new Date(periodYear, periodMonth, 1);
    const periodEnd = new Date(periodYear, periodMonth + 1, 0); // Last day of month

    // Pro-rata for first month
    const periodFraction = i === 0 ? firstMonthFraction : 1;

    let depAmount: number;

    if (depreciationMethod === "StraightLine") {
      depAmount = calculateStraightLine(purchasePrice, residualValue, usefulLifeYears, periodFraction);
    } else if (depreciationMethod === "DiminishingValue") {
      depAmount = calculateDiminishingValue(currentBookValue, diminishingRate, periodFraction);
    } else {
      // Default to straight line for unsupported methods
      depAmount = calculateStraightLine(purchasePrice, residualValue, usefulLifeYears, periodFraction);
    }

    // Do not depreciate below residual value
    if (currentBookValue - depAmount < residualValue) {
      depAmount = Math.round((currentBookValue - residualValue) * 100) / 100;
    }

    if (depAmount <= 0) break;

    const openingValue = currentBookValue;
    accumulatedDep = Math.round((accumulatedDep + depAmount) * 100) / 100;
    currentBookValue = Math.round((currentBookValue - depAmount) * 100) / 100;

    schedule.push({
      periodStart,
      periodEnd,
      openingValue: Math.round(openingValue * 100) / 100,
      depreciationAmount: depAmount,
      accumulatedDepreciation: accumulatedDep,
      closingValue: currentBookValue,
    });

    if (currentBookValue <= residualValue) break;
  }

  return schedule;
}

/**
 * Calculate gain or loss on disposal of a fixed asset.
 * @param bookValue - Current book (written-down) value at disposal date
 * @param disposalPrice - Price received on disposal
 * @returns Positive = gain, negative = loss
 */
export function calculateDisposalGainLoss(
  bookValue: number,
  disposalPrice: number
): number {
  return Math.round((disposalPrice - bookValue) * 100) / 100;
}

/**
 * Check eligibility for Australian Instant Asset Write-Off.
 * Current rules: assets under $20,000 for entities with aggregated turnover < $10M.
 * @param cost - Asset purchase cost (ex-GST)
 * @param entityTurnover - Entity's aggregated annual turnover
 * @returns Object with eligibility flag, write-off amount, and reason
 */
export function getInstantAssetWriteOff(
  cost: number,
  entityTurnover: number
): { eligible: boolean; writeOffAmount: number; reason: string } {
  const THRESHOLD = 20000;
  const TURNOVER_LIMIT = 10_000_000;

  if (entityTurnover >= TURNOVER_LIMIT) {
    return {
      eligible: false,
      writeOffAmount: 0,
      reason: `Entity turnover ($${entityTurnover.toLocaleString()}) exceeds the $10M aggregated turnover threshold`,
    };
  }

  if (cost >= THRESHOLD) {
    return {
      eligible: false,
      writeOffAmount: 0,
      reason: `Asset cost ($${cost.toLocaleString()}) exceeds the $20,000 instant asset write-off threshold`,
    };
  }

  return {
    eligible: true,
    writeOffAmount: cost,
    reason: `Asset qualifies for instant write-off: cost $${cost.toLocaleString()} < $20,000 and turnover $${entityTurnover.toLocaleString()} < $10M`,
  };
}

/**
 * Calculate the additional R&D depreciation bonus for eligible R&D assets.
 * Under the R&D Tax Incentive, eligible entities can claim an offset on
 * depreciation of assets used in R&D activities.
 * @param depreciationAmount - Standard depreciation amount for the period
 * @param rdPercentage - Percentage of asset usage attributable to R&D (0-100)
 * @returns Additional R&D offset amount (at the 43.5% non-refundable or 18.5% refundable notional rate)
 */
export function getRdDepreciationBonus(
  depreciationAmount: number,
  rdPercentage: number
): { eligibleDepreciation: number; rdOffset: number; notionalDeduction: number } {
  const clampedPercentage = Math.min(100, Math.max(0, rdPercentage));
  const eligibleDepreciation = Math.round((depreciationAmount * clampedPercentage / 100) * 100) / 100;

  // The R&D Tax Incentive provides a notional deduction at the company tax rate (25%)
  // plus an additional offset (43.5% for < $20M turnover, 38.5% for >= $20M)
  // The bonus is the difference: 43.5% - 25% = 18.5% additional offset for refundable
  const REFUNDABLE_OFFSET_RATE = 0.185; // 18.5% additional for entities < $20M turnover
  const rdOffset = Math.round(eligibleDepreciation * REFUNDABLE_OFFSET_RATE * 100) / 100;
  const notionalDeduction = eligibleDepreciation;

  return {
    eligibleDepreciation,
    rdOffset,
    notionalDeduction,
  };
}
