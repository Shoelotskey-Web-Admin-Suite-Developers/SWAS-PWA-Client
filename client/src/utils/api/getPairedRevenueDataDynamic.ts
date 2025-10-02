import { BranchMeta } from '@/utils/analytics/branchMeta';

export interface DynamicPairedRow {
  date: string;
  [key: string]: any; // dynamic branch keys + totals
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getPairedRevenueDataDynamic(branchMeta: BranchMeta[]): Promise<DynamicPairedRow[]> {
  const base = API_BASE_URL && API_BASE_URL.length > 0 ? API_BASE_URL.replace(/\/$/, '') : 'http://localhost:5000';
  const [actualRes, forecastRes] = await Promise.all([
    fetch(`${base}/api/analytics/daily-revenue`),
    fetch(`${base}/api/analytics/forecast`),
  ]);
  if (!actualRes.ok) throw new Error('Failed to fetch daily revenue');
  if (!forecastRes.ok) throw new Error('Failed to fetch forecast');
  const actualRaw: any[] = await actualRes.json();
  const forecastRaw: any[] = await forecastRes.json();
  // forecastRaw now expected (after backend normalization) to be an array of
  // { date: 'yyyy-MM-dd', total: number, branches: { [branch_id]: value } }
  // but we keep robust extraction for transitional or legacy shapes.

  function extract(record: any, branch_id: string): number | null {
    if (!record) return null;
    if (typeof record[branch_id] === 'number') return record[branch_id];
    if (record.branches) {
      const br = record.branches;
      if (Array.isArray(br)) {
        for (const e of br) {
          if (!e) continue;
          const ids = [e.branch_id, e.code, e.id, e.branch, e.name];
            if (ids.some(id => typeof id === 'string' && id.toUpperCase() === branch_id.toUpperCase())) {
              const val = e.value ?? e.amount ?? e.total ?? e.revenue;
              if (typeof val === 'number') return val;
            }
        }
      } else if (typeof br === 'object') {
        if (typeof br[branch_id] === 'number') return br[branch_id];
        // try case variants
        const alt = br[branch_id.toLowerCase()] ?? br[branch_id.toUpperCase()];
        if (typeof alt === 'number') return alt;
      }
    }
    const codePart = branch_id.split('-')[0];
    for (const k of Object.keys(record)) {
      if (k.toUpperCase().startsWith(codePart.toUpperCase()) && typeof record[k] === 'number') return record[k];
    }
    return null;
  }

  const actualSorted = [...actualRaw].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const todayStr = new Date().toISOString().slice(0,10);
  const priorActual = actualSorted.filter(r => new Date(r.date).toISOString().slice(0,10) < todayStr);
  const latest7 = priorActual.slice(-7);
  const forecastMap = new Map<string, any>();
  forecastRaw.forEach(f => forecastMap.set(new Date(f.date).toISOString().slice(0,10), f));

  function buildRow(dateStr: string, a?: any, f?: any): DynamicPairedRow {
    const row: DynamicPairedRow = { date: dateStr };
    let actualTotal = 0; let forecastTotal = 0;
    for (const meta of branchMeta) {
      if (meta.branch_id === 'TOTAL') continue;
      const val = a ? extract(a, meta.branch_id) : null;
      const fval = f ? extract(f, meta.branch_id) : null;
      if (val != null) { row[meta.dataKey] = val; actualTotal += Number(val)||0; }
      if (fval != null) { row[meta.forecastKey] = fval; forecastTotal += Number(fval)||0; }
    }
    // Only show total for rows that have actual data; hide (null) for forecast-only rows
    if (a) {
      row.total = actualTotal; // allow zero
    } else {
      row.total = null;
    }
    row.totalFC = forecastTotal;
    // Legacy compatibility
    const legacy: Record<string,string> = { 'SMVAL-B-NCR':'SMVal','VAL-B-NCR':'Val','SMGRA-B-NCR':'SMGra' };
    for (const meta of branchMeta) {
      const legacyKey = legacy[meta.branch_id];
      if (legacyKey && row[meta.dataKey] != null) row[legacyKey] = row[meta.dataKey];
      if (legacyKey && row[meta.forecastKey] != null) row[legacyKey+'FC'] = row[meta.forecastKey];
    }
    return row;
  }

  const rows: DynamicPairedRow[] = [];
  latest7.forEach(a => {
    const ds = new Date(a.date).toISOString().slice(0,10);
    rows.push(buildRow(ds, a, forecastMap.get(ds)));
  });
  forecastRaw.forEach(f => {
    const ds = new Date(f.date).toISOString().slice(0,10);
    if (!rows.some(r => r.date === ds)) rows.push(buildRow(ds, undefined, f));
  });
  rows.sort((a,b) => a.date.localeCompare(b.date));
  return rows;
}
