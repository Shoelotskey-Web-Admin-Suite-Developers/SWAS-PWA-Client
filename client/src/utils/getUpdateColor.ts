export function getUpdateColor(lastUpdate: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - lastUpdate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 7) return "bg-red-200 text-red-800";
  if (diffDays >= 5) return "bg-orange-200 text-orange-800";
  if (diffDays >= 3) return "bg-yellow-200 text-yellow-800";
  return "";
}