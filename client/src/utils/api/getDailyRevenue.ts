// utils/api/getDailyRevenue.ts

export interface DailyRevenueItem {
  date: string
  SMVal?: number | null
  Val?: number | null
  SMGra?: number | null
  total?: number | null
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getDailyRevenue = async (): Promise<DailyRevenueItem[]> => {
  try {
    const base = API_BASE_URL && API_BASE_URL.length > 0
      ? API_BASE_URL.replace(/\/$/, "")
      : "http://localhost:5000";
    
    if (!API_BASE_URL) {
      console.warn("VITE_API_BASE_URL not set — defaulting to http://localhost:5000 for analytics fetches");
    }
    
    const actualUrl = `${base}/api/analytics/daily-revenue`;
    const response = await fetch(actualUrl);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch daily revenue (${response.status}): ${body.slice(0, 300)}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`daily-revenue did not return JSON (content-type: ${contentType}). Response preview: ${text.slice(0,300)}`);
    }

    const dailyRevenueRaw: any[] = await response.json();
    
    // Helper function to find branch value using patterns similar to getForecastChart.tsx
    const findBranchValue = (r: any, patterns: RegExp[]): number | null => {
      if (!r) return null;
      const keys: string[] = [];
      
      // collect top-level keys
      Object.keys(r || {}).forEach((k) => keys.push(k));
      
      // collect branch map keys if present
      if (r.branches && typeof r.branches === "object") {
        if (Array.isArray(r.branches)) {
          r.branches.forEach((el: any, idx: number) => {
            if (el && typeof el === "object") {
              Object.keys(el).forEach((k) => keys.push(k));
              keys.push(String(idx));
            }
          });
        } else {
          Object.keys(r.branches).forEach((k) => keys.push(k));
        }
      }

      for (const pattern of patterns) {
        for (const k of keys) {
          if (pattern.test(k)) {
            if (r.branches) {
              if (r.branches[k] !== undefined) return r.branches[k];
              if (Array.isArray(r.branches)) {
                for (const el of r.branches) {
                  if (!el || typeof el !== "object") continue;
                  const valByCommon = el.value ?? el.amount ?? el.total ?? el["amountPhp"] ?? el["revenue"];
                  const idCandidates = [el.code, el.branch, el.name, el.id];
                  for (const idc of idCandidates) {
                    if (typeof idc === "string" && pattern.test(idc) && valByCommon !== undefined) return valByCommon;
                  }
                  for (const ek of Object.keys(el)) {
                    if (pattern.test(ek) && typeof el[ek] === "number") return el[ek];
                  }
                }
              }
            }
            if (r[k] !== undefined) return r[k];
          }
        }
      }

      // fallback to explicit fields
      for (const k of ["SMVal", "Val", "SMGra"]) {
        if (r[k] !== undefined) return r[k];
      }

      return null;
    };

    const patterns = {
      SMVal: [/SMVAL/i, /SM VAL/i],
      Val: [/\bVAL\b/i],
      SMGra: [/SMGRA/i, /SM GRA/i, /SM GRAND/i],
    };

    // Transform the raw data
    const transformedData: DailyRevenueItem[] = dailyRevenueRaw.map((r) => {
      const SMVal = findBranchValue(r, patterns.SMVal as RegExp[]);
      const Val = findBranchValue(r, patterns.Val as RegExp[]);
      const SMGra = findBranchValue(r, patterns.SMGra as RegExp[]);
      
      // Calculate total from all branches
      const total = (SMVal || 0) + (Val || 0) + (SMGra || 0);
      
      return {
        date: new Date(r.date).toISOString().slice(0, 10),
        SMVal,
        Val,
        SMGra,
        total: total > 0 ? total : null,
      };
    });

    // Sort data chronologically
    const sortedData = transformedData.sort((a, b) => {
      const ta = Date.parse(a.date);
      const tb = Date.parse(b.date);
      if (!isNaN(ta) && !isNaN(tb)) return ta - tb;
      return String(a.date).localeCompare(String(b.date));
    });

    return sortedData;
  } catch (err) {
    console.error("Error fetching daily revenue:", err);
    throw err;
  }
};