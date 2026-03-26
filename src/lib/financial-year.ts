/**
 * Australian Financial Year utilities.
 * The Australian financial year runs from July 1 to June 30.
 * FY "2025-26" means July 1, 2025 to June 30, 2026.
 */

export function getCurrentFY(): string {
  const now = new Date()
  const month = now.getMonth() // 0-based: 0=Jan, 6=Jul
  const year = now.getFullYear()
  // If we're in Jul-Dec, the FY started this calendar year
  // If we're in Jan-Jun, the FY started last calendar year
  const startYear = month >= 6 ? year : year - 1
  const endYear = startYear + 1
  return `${startYear}-${String(endYear).slice(2)}`
}

export function getFYDates(fy: string): { startDate: Date; endDate: Date } {
  const parts = fy.split("-")
  const startYear = parseInt(parts[0], 10)
  const endYearShort = parseInt(parts[1], 10)
  // Handle both "2025-26" and "2025-2026" formats
  const endYear = endYearShort < 100 ? Math.floor(startYear / 100) * 100 + endYearShort : endYearShort
  return {
    startDate: new Date(startYear, 6, 1), // July 1
    endDate: new Date(endYear, 5, 30, 23, 59, 59, 999), // June 30, end of day
  }
}

export function getFYOptions(): { label: string; value: string }[] {
  const currentFY = getCurrentFY()
  const startYear = parseInt(currentFY.split("-")[0], 10)
  const options: { label: string; value: string }[] = []
  for (let i = 0; i < 5; i++) {
    const sy = startYear - i
    const ey = sy + 1
    const value = `${sy}-${String(ey).slice(2)}`
    options.push({
      label: `FY ${value}`,
      value,
    })
  }
  return options
}

export function getQuarterDates(
  fy: string,
  quarter: number
): { startDate: Date; endDate: Date } {
  if (quarter < 1 || quarter > 4) {
    throw new Error("Quarter must be between 1 and 4")
  }
  const { startDate: fyStart } = getFYDates(fy)
  const fyStartYear = fyStart.getFullYear()

  // Q1: Jul-Sep, Q2: Oct-Dec, Q3: Jan-Mar, Q4: Apr-Jun
  const quarterMonths: [number, number, number][] = [
    [6, fyStartYear, fyStartYear],      // Q1: Jul (6) to Sep (8)
    [9, fyStartYear, fyStartYear],      // Q2: Oct (9) to Dec (11)
    [0, fyStartYear + 1, fyStartYear + 1], // Q3: Jan (0) to Mar (2)
    [3, fyStartYear + 1, fyStartYear + 1], // Q4: Apr (3) to Jun (5)
  ]

  const [startMonth, startYr] = quarterMonths[quarter - 1]
  const endMonth = startMonth + 2
  const endYr = startYr

  // Last day of the end month
  const lastDay = new Date(endYr, endMonth + 1, 0).getDate()

  return {
    startDate: new Date(startYr, startMonth, 1),
    endDate: new Date(endYr, endMonth, lastDay, 23, 59, 59, 999),
  }
}

export function formatFYPeriod(startDate: Date, endDate: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  return `${fmt(startDate)} - ${fmt(endDate)}`
}
