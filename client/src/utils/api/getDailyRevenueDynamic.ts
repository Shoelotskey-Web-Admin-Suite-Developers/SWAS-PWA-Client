import { BranchMeta } from '@/utils/analytics/branchMeta';

export interface DynamicDailyItem { date: string; [key:string]: any }
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getDailyRevenueDynamic(branchMeta: BranchMeta[]): Promise<DynamicDailyItem[]> {
  const base = API_BASE_URL && API_BASE_URL.length > 0 ? API_BASE_URL.replace(/\/$/, '') : 'http://localhost:5000';
  const res = await fetch(`${base}/api/analytics/daily-revenue`);
  if (!res.ok) throw new Error('Failed to fetch daily revenue');
  const raw: any[] = await res.json();
  if (raw.length === 0) {
    console.warn('[getDailyRevenueDynamic] Received empty daily-revenue array');
  } else {
    console.debug('[getDailyRevenueDynamic] Sample raw row keys:', Object.keys(raw[0]));
  }

  function extract(record: any, branch_id: string): number | null {
    if (typeof record[branch_id] === 'number') return record[branch_id];
    const codePart = branch_id.split('-')[0];
    for (const k of Object.keys(record)) {
      if (k.toUpperCase().startsWith(codePart.toUpperCase()) && typeof record[k] === 'number') return record[k];
    }
    if (record.branches) {
      const br = record.branches;
      if (Array.isArray(br)) {
        for (const e of br) {
          const ids = [e.branch_id, e.code, e.id, e.branch, e.name];
          if (ids.some(id => typeof id === 'string' && id.toUpperCase() === branch_id.toUpperCase())) {
            const val = e.value ?? e.amount ?? e.total ?? e.revenue;
            if (typeof val === 'number') return val;
          }
        }
      } else if (typeof br === 'object' && typeof br[branch_id] === 'number') return br[branch_id];
    }
    return null;
  }

  const rows = raw.map(r => {
    const date = new Date(r.date).toISOString().slice(0,10);
    const row: DynamicDailyItem = { date };
    let total = 0;
    for (const meta of branchMeta) {
      if (meta.branch_id === 'TOTAL') continue;
      const val = extract(r, meta.branch_id);
      if (val != null) {
        row[meta.dataKey] = val; 
        total += Number(val)||0; 
      } else if (r.branches && typeof r.branches === 'object') {
        // attempt second-chance fetch from Map-like object
        const mv = r.branches[meta.branch_id] ?? r.branches[meta.branch_id.toLowerCase()] ?? r.branches[meta.branch_id.toUpperCase()];
        if (typeof mv === 'number') { row[meta.dataKey] = mv; total += Number(mv)||0; }
      }
    }
    row.total = total >= 0 ? total : null; // keep zero instead of null so charts show baseline
    const legacy: Record<string,string> = { 'SMVAL-B-NCR':'SMVal','VAL-B-NCR':'Val','SMGRA-B-NCR':'SMGra' };
    for (const meta of branchMeta) {
      const lk = legacy[meta.branch_id];
      if (lk && row[meta.dataKey] != null) row[lk] = row[meta.dataKey];
    }
    return row;
  }).sort((a,b) => a.date.localeCompare(b.date));
  console.debug('[getDailyRevenueDynamic] Produced rows count:', rows.length, 'Keys example:', rows[0] ? Object.keys(rows[0]) : []);
  return rows;
}
