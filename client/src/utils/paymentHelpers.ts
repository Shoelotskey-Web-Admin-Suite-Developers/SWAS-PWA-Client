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
        if (add > 0) storageFeeTotal += add
      }
    }
  } catch (e) {
    // fail-safe: don't throw from helper
    console.debug('computeStorageFeeFromLineItems failed', e)
  }
  return storageFeeTotal
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
