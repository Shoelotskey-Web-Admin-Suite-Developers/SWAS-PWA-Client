// NOTE: This file is retained only for backward compatibility. Prefer using
// getPairedRevenueDataDynamic(branchMeta) from its new module. Remove this file
// once all legacy imports are eliminated.

// Basic revenue item shape used in legacy charts
export interface DailyRevenueItem {
  date: string
  SMVal?: number | null
  Val?: number | null
  SMGra?: number | null
}


// Legacy forecast item (mirrors DailyRevenueItem, extended when needed)
export type DailyRevenueForecastItem = DailyRevenueItem

/**
 * Deprecated stub kept to avoid runtime crashes while older code paths are phased out.
 * Always use getPairedRevenueDataDynamic instead.
 */
export async function getPairedRevenueData(): Promise<never> {
  throw new Error('Deprecated: use getPairedRevenueDataDynamic(branchMeta) instead.')
}

// Intentionally no default export.
