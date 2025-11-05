import { BranchMeta } from '@/utils/analytics/branchMeta';

export interface DynamicPairedRow {
  week_start: string;
  [key: string]: any; // dynamic branch keys + totals
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getPairedRevenueDataDynamic(branchMeta: BranchMeta[], limit = 5): Promise<DynamicPairedRow[]> {
  const base = API_BASE_URL && API_BASE_URL.length > 0 ? API_BASE_URL.replace(/\/$/, '') : 'http://localhost:5000';
  const [actualRes, forecastRes] = await Promise.all([
    fetch(`${base}/api/analytics/weekly-revenue`),
    fetch(`${base}/api/analytics/weekly-forecast`),
  ]);
  if (!actualRes.ok) throw new Error('Failed to fetch weekly revenue');
  if (!forecastRes.ok) throw new Error('Failed to fetch weekly forecast');
  const actualRaw: any[] = await actualRes.json();
  const forecastRaw: any[] = await forecastRes.json();
  // forecastRaw now expected (after backend normalization) to be an array of
  // { date: 'yyyy-MM-dd', total: number, branches: { [branch_id]: value } }
  // but we keep robust extraction for transitional or legacy shapes.

  function extract(record: any, branch_id: string): number | null {
    if (!record) return null;
    // Support top-level branch keys or map-like branches
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

  // Normalize keys: weekly records use `week_start`; fallback to `date` if present
  const normalizeDate = (r: any) => {
    const raw = r.week_start ?? r.date;
    return raw ? new Date(raw).toISOString().slice(0,10) : null;
  }

  const actualSorted = [...actualRaw].filter(a => normalizeDate(a)).sort((a,b) => {
    const ta = new Date(normalizeDate(a)!).getTime();
    const tb = new Date(normalizeDate(b)!).getTime();
    return ta - tb;
  });

  // Take latest `limit` weeks from actuals
  const latestActuals = actualSorted.slice(-Math.max(0, limit));

  const forecastMap = new Map<string, any>();
  forecastRaw.forEach(f => {
    const k = normalizeDate(f);
    if (k) forecastMap.set(k, f);
  });

  function buildRow(weekStr: string, a?: any, f?: any): DynamicPairedRow {
    const row: DynamicPairedRow = { week_start: weekStr };
  let actualTotal = 0; let forecastTotal = 0;
    for (const meta of branchMeta) {
      if (meta.branch_id === 'TOTAL') continue;
      const val = a ? extract(a, meta.branch_id) : null;
      const fval = f ? extract(f, meta.branch_id) : null;
      if (val != null) { row[meta.dataKey] = val; actualTotal += Number(val)||0; }
      if (fval != null) { row[meta.forecastKey] = fval; forecastTotal += Number(fval)||0; }
    }
    // Only show total for rows that have actual data; hide (null) for forecast-only rows
    const actualSourceTotal = a && typeof a.total === 'number' ? a.total : actualTotal;
    const forecastSourceTotal = f && typeof f.total === 'number' ? f.total : forecastTotal;
    if (a) {
      row.total = actualSourceTotal; // allow zero
    } else {
      row.total = null;
    }
    row.totalFC = forecastSourceTotal;
    // Legacy compatibility
    const legacy: Record<string,string> = { 'SMVAL-B-NCR':'SMVal','SMBAL-B-NCR':'SMBal','SMGRA-B-NCR':'SMGra' };
    for (const meta of branchMeta) {
      const legacyKey = legacy[meta.branch_id];
      if (legacyKey && row[meta.dataKey] != null) row[legacyKey] = row[meta.dataKey];
      if (legacyKey && row[meta.forecastKey] != null) row[legacyKey+'FC'] = row[meta.forecastKey];
    }
    return row;
  }

  const rows: DynamicPairedRow[] = [];

  // Build rows from latest actuals
  latestActuals.forEach(a => {
    const ds = normalizeDate(a)!;
    rows.push(buildRow(ds, a, forecastMap.get(ds)));
  });

  // Ensure forecast-only weeks (not in actuals) are included — e.g., future forecast weeks
  for (const [k, f] of forecastMap.entries()) {
    if (!rows.some(r => r.week_start === k)) {
      rows.push(buildRow(k, undefined, f));
    }
  }

  // Sort final rows by week_start ascending
  rows.sort((a,b) => a.week_start.localeCompare(b.week_start));
  return rows;
}
