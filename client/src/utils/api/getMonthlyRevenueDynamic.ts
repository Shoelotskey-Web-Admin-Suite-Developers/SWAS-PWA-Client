import { BranchMeta } from '@/utils/analytics/branchMeta';

export interface DynamicMonthlyRow { month: string; total?: number; [key:string]: any }
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Simplified version aligned with new backend shape: each record: { month, total, branches: { <branch_id>: value } }
export async function getMonthlyRevenueDynamic(branchMeta: BranchMeta[]): Promise<DynamicMonthlyRow[]> {
  const base = API_BASE_URL && API_BASE_URL.length > 0 ? API_BASE_URL.replace(/\/$/, '') : 'http://localhost:5000';
  const res = await fetch(`${base}/api/analytics/monthly-revenue`);
  if (!res.ok) throw new Error('Failed to fetch monthly revenue');
  const raw: any[] = await res.json();
  if (raw.length === 0) {
    console.warn('[getMonthlyRevenueDynamic] Received empty monthly-revenue array');
    return [];
  }
  console.debug('[getMonthlyRevenueDynamic] Sample raw month row keys:', Object.keys(raw[0]));

  return raw.map(r => {
    let month = r.month;
    if (typeof month === 'string' && /\d{4}-\d{2}-\d{2}/.test(month)) month = month.slice(0,7);
    const row: DynamicMonthlyRow = { month };
    const branchesObj: Record<string, number> = (r.branches && typeof r.branches === 'object') ? r.branches : {};

    // Build lookup for quick access
    const byId: Record<string, number> = {};
    Object.entries(branchesObj).forEach(([k,v]) => { if (typeof v === 'number') byId[k] = v; });

    let computedTotal = 0;
    branchMeta.forEach(m => {
      if (m.branch_id === 'TOTAL') return;
      const val = byId[m.branch_id];
      if (typeof val === 'number') {
        row[m.dataKey] = val;
        computedTotal += val;
      }
    });
    row.total = typeof r.total === 'number' ? r.total : computedTotal;
    return row;
  });
}
