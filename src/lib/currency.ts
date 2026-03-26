/**
 * Multi-Currency Engine
 * Exchange rate management, currency conversion, and FX gain/loss calculations.
 */

import { prisma } from "@/lib/prisma";

/**
 * Get the exchange rate for a currency pair on a given date.
 * Falls back to the nearest available rate if no exact match.
 * @param orgId - Organization ID
 * @param from - Source currency code (e.g. "USD")
 * @param to - Target currency code (e.g. "AUD")
 * @param date - The date for the rate
 * @returns The exchange rate record, or null if none found
 */
export async function getExchangeRate(
  orgId: string,
  from: string,
  to: string,
  date: Date
) {
  // Try exact date first
  let rate = await prisma.exchangeRate.findFirst({
    where: {
      organizationId: orgId,
      fromCurrency: from,
      toCurrency: to,
      effectiveDate: date,
    },
  });

  if (rate) return rate;

  // Fall back to the nearest rate before or on the date
  rate = await prisma.exchangeRate.findFirst({
    where: {
      organizationId: orgId,
      fromCurrency: from,
      toCurrency: to,
      effectiveDate: { lte: date },
    },
    orderBy: { effectiveDate: "desc" },
  });

  if (rate) return rate;

  // Try the nearest future rate if no past rate exists
  rate = await prisma.exchangeRate.findFirst({
    where: {
      organizationId: orgId,
      fromCurrency: from,
      toCurrency: to,
      effectiveDate: { gte: date },
    },
    orderBy: { effectiveDate: "asc" },
  });

  return rate;
}

/**
 * Convert an amount from one currency to another using the provided rate.
 * @param amount - The amount in the source currency
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param rate - Exchange rate (how many units of toCurrency per 1 unit of fromCurrency)
 * @returns Converted amount rounded to 2 decimal places
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number
): number {
  if (fromCurrency === toCurrency) return amount;
  if (rate <= 0) throw new Error("Exchange rate must be positive");
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Calculate unrealized FX gain or loss.
 * Compares the original conversion with what it would be at the current rate.
 * @param originalAmount - Amount in foreign currency
 * @param originalRate - Rate used at time of original transaction
 * @param currentRate - Current exchange rate
 * @returns Positive = gain, negative = loss (in base currency)
 */
export function calculateFxGainLoss(
  originalAmount: number,
  originalRate: number,
  currentRate: number
): number {
  const originalBase = originalAmount * originalRate;
  const currentBase = originalAmount * currentRate;
  return Math.round((currentBase - originalBase) * 100) / 100;
}

/**
 * Batch revaluation of open foreign currency balances.
 * Finds all unpaid invoices and bills with foreign currency amounts
 * and calculates unrealized gain/loss at the given date's rate.
 * @param orgId - Organization ID
 * @param date - Revaluation date (uses rates effective on this date)
 * @returns Summary of revaluation results
 */
export async function revalueForeignBalances(
  orgId: string,
  date: Date
): Promise<{
  revaluations: Array<{
    entityType: string;
    entityId: string;
    originalCurrency: string;
    originalAmount: number;
    originalRate: number;
    currentRate: number;
    gainLoss: number;
  }>;
  totalGainLoss: number;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { baseCurrency: true },
  });

  if (!org) throw new Error("Organization not found");

  const baseCurrency = org.baseCurrency;
  const revaluations: Array<{
    entityType: string;
    entityId: string;
    originalCurrency: string;
    originalAmount: number;
    originalRate: number;
    currentRate: number;
    gainLoss: number;
  }> = [];

  // Get all currencies used by the organization (excluding base)
  const currencies = await prisma.currency.findMany({
    where: { organizationId: orgId, isBase: false },
  });

  for (const currency of currencies) {
    // Get the current rate for this currency pair
    const currentRateRecord = await getExchangeRate(
      orgId,
      currency.code,
      baseCurrency,
      date
    );

    if (!currentRateRecord) continue;

    const currentRate = currentRateRecord.rate;

    // Find existing FX gain/loss records for open items in this currency
    const existingFx = await prisma.fxGainLoss.findMany({
      where: {
        organizationId: orgId,
        originalCurrency: currency.code,
      },
    });

    for (const fx of existingFx) {
      if (fx.exchangeRateUsed === currentRate) continue; // No change

      const gainLoss = calculateFxGainLoss(
        fx.originalAmount,
        fx.exchangeRateUsed,
        currentRate
      );

      if (Math.abs(gainLoss) > 0.01) {
        revaluations.push({
          entityType: fx.transactionType,
          entityId: fx.transactionId,
          originalCurrency: fx.originalCurrency,
          originalAmount: fx.originalAmount,
          originalRate: fx.exchangeRateUsed,
          currentRate,
          gainLoss,
        });
      }
    }
  }

  const totalGainLoss = revaluations.reduce((sum, r) => sum + r.gainLoss, 0);

  return {
    revaluations,
    totalGainLoss: Math.round(totalGainLoss * 100) / 100,
  };
}
