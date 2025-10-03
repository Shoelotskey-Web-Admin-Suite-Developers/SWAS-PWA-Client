// Shared helpers for the Payments page
import { computePickupAllowance } from "@/utils/computePickupAllowance"

export const RUSH_FEE = 150

export function formatCurrency(n: number) {
  return "₱" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

/**
 * Calculate total from an array of shoes. Expects shoe.services to be an array of service names.
 * findServicePriceFn resolves a service name to a numeric price.
 */
export function calculateTotal(
  shoes: any[],
  discount: number | null,
  findServicePriceFn: (serviceName: string) => number
): number {
  let total = 0

  shoes.forEach((shoe) => {
    const serviceTotal = (shoe.services || []).reduce(
      (sum: number, srv: string) => sum + findServicePriceFn(srv),
      0
    )
    const rushFee = shoe.rush === "yes" ? RUSH_FEE : 0

    total += serviceTotal + rushFee
  })

  if (discount) total -= discount
  return Math.max(total, 0)
}

/**
 * Compute storage fee from an array of line items.
 * For each line item, compute exceededDays using computePickupAllowance(pickUpNoticeDate).
 * If exceededDays > 0 then computed = exceededDays * 100. Subtract any existing stored storage_fee on that line item.
 * Only positive additions are summed and returned.
 */
export function computeStorageFeeFromLineItems(lineItems: any[] | undefined | null): number {
  try { console.log('[storageFee] computeStorageFeeFromLineItems called with', Array.isArray(lineItems) ? lineItems.length : 'non-array'); } catch(_){}
  if (!Array.isArray(lineItems) || lineItems.length === 0) return 0
  let storageFeeTotal = 0
  try {
    for (const li of lineItems) {
      const pickUpNotice = li.pick_up_notice || li.pickUpNotice || li.pickup_notice || li.pickupNotice || null
      const remaining = computePickupAllowance(pickUpNotice ? new Date(pickUpNotice) : null)
      const exceededDays = remaining < 0 ? Math.abs(remaining) : 0
      if (exceededDays > 0) {
        const existing = Number(li.storage_fee ?? li.storageFee ?? 0) || 0
        const computed = exceededDays * 100
        const add = Math.max(0, computed - existing)
        // Debug logging (guarded so noisy logs can be disabled easily if needed)
        try {
          const payload = {
            line_item_id: li.line_item_id || li.id,
            pickUpNotice,
            remainingAllowanceDays: remaining,
            exceededDays,
            existingRecorded: existing,
            computedTarget: computed,
            incrementalAdd: add,
          }
          console.debug('[storageFee] line_item', payload)
          console.log('[storageFee] line_item', payload)
        } catch (_) { /* ignore logging errors */ }
        if (add > 0) storageFeeTotal += add
      } else {
        try {
          const payload = {
            line_item_id: li.line_item_id || li.id,
            pickUpNotice,
            remainingAllowanceDays: remaining,
          }
            console.debug('[storageFee] line_item within allowance or no overdue', payload)
            console.log('[storageFee] line_item within allowance or no overdue', payload)
        } catch (_) { /* ignore logging errors */ }
      }
    }
    try {
      console.debug('[storageFee] total incremental storageFeeTotal=', storageFeeTotal)
      console.log('[storageFee] total incremental storageFeeTotal=', storageFeeTotal)
    } catch (_) { /* ignore */ }
  } catch (e) {
    // fail-safe: don't throw from helper
    console.debug('computeStorageFeeFromLineItems failed', e)
  }
  return storageFeeTotal
}

  // Diagnostics: returns detailed breakdown instead of just total.
  export function computeStorageFeeDiagnostics(lineItems: any[] | undefined | null) {
    const details: any[] = []
    let totalIncremental = 0
    let totalTheoretical = 0
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return { count: 0, totalIncremental, totalTheoretical, details }
    }
    for (const li of lineItems) {
      try {
        const pickUpNotice = li.pick_up_notice || li.pickUpNotice || li.pickup_notice || li.pickupNotice || null
        const remaining = computePickupAllowance(pickUpNotice ? new Date(pickUpNotice) : null)
        const exceededDays = remaining < 0 ? Math.abs(remaining) : 0
        const existing = Number(li.storage_fee ?? li.storageFee ?? 0) || 0
        const theoretical = exceededDays * 100
        const incremental = exceededDays > 0 ? Math.max(0, theoretical - existing) : 0
        totalIncremental += incremental
        totalTheoretical += theoretical
        details.push({
          line_item_id: li.line_item_id || li.id,
          pickUpNotice,
          remainingAllowanceDays: remaining,
          exceededDays,
          existingRecorded: existing,
          theoretical,
          incremental,
        })
      } catch (e) {
        details.push({ error: true, message: String(e) })
      }
    }
    return { count: details.length, totalIncremental, totalTheoretical, details }
  }

/**
 * Compute updated payment status after applying a payment amount (dueNow).
 * Rules:
 * - NP: no payment before and still no payment after this action
 * - PAID: previous payments + dueNow >= total + storageFee
 * - PARTIAL: otherwise (some payment exists but not fully paid)
 */
export function getUpdatedStatus(prevPaid: number, dueNow: number, total: number, storageFee: number | undefined | null): string {
  const totalDue = Number(total || 0) + Number(storageFee || 0)
  const totalPaidAfter = Number(prevPaid || 0) + Number(dueNow || 0)
  if (totalPaidAfter === 0) return 'NP'
  if (totalPaidAfter >= totalDue) return 'PAID'
  return 'PARTIAL'
}

/**
 * Compute updated balance shown to UI: max(0, total - amountPaid + storageFee)
 */
export function computeUpdatedBalance(total: number, amountPaid: number, storageFee?: number) {
  return Math.max(0, Number(total || 0) - Number(amountPaid || 0) + Number(storageFee || 0))
}

// Realtime Note: The Payments page now uses `usePaymentsLineItemSocket` hook to listen
// for `lineItemUpdated` events. When a line item's `current_status` becomes
// "Picked Up", that line item (and possibly its parent request if empty) is removed
// from the payments table immediately without requiring a manual refresh.
