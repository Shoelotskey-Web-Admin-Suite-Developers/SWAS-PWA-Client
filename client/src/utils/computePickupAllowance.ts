export function computePickupAllowance(pickUpNotice?: Date | null, allowanceDays = 10): number {
  if (!pickUpNotice) return allowanceDays;
  const now = new Date();
  const diffMs = now.getTime() - pickUpNotice.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return allowanceDays - diffDays;
}