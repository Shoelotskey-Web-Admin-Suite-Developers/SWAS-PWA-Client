// Utility functions for SRM page

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatCurrency(n: number) {
  return '₱' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function pad(n: number) {
  return String(n).padStart(2, '0');
}
