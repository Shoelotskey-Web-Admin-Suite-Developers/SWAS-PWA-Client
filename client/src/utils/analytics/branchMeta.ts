// utils/analytics/branchMeta.ts
// Construct metadata for dynamic branch-driven analytics.

export interface BranchMeta {
  numericId: string;          // stable hashed selection identifier
  branch_id: string;          // DB branch_id
  branch_name: string;        // human readable name
  color: string;              // deterministic visually distinct color
  dataKey: string;            // sanitized key for actual data in chart rows
  forecastKey: string;        // sanitized key for forecast data in chart rows
}

// Fixed curated palette (no reds / pinks). Ordered for contrast variety.
// Feel free to adjust ordering if you want different initial emphasis.
const BASE_PALETTE = [
  '#2563EB', // blue
  '#F59E0B', // amber (yellow-orange accent)
  '#16A34A', // green
  '#6366F1', // indigo
  '#0891B2', // cyan
  '#d2bb0eff', // orange (mid vivid)
  '#65A30D', // lime
  '#0D9488', // teal
  '#80fa15ff', // bright yellow
  '#7C3AED', // violet
  '#0284C7', // sky
  '#059669', // emerald
  '#4F46E5', // indigo-deep
  '#14B8A6', // teal-light
  '#1D4ED8', // blue-deep
  '#3F6212', // olive/green-dark
];

// Lighten/darken variants to extend palette deterministically if branches > BASE_PALETTE length
function deriveVariant(hex: string, variantIndex: number): string {
  // Simple HSL adjustment: convert hex -> hsl, tweak lightness
  try {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0;
    const l = (max + min) / 2 / 255; // 0-1
    const d = max - min;
    if (d !== 0) {
      s = d / (1 - Math.abs(2*l -1));
      switch(max){
        case r: h = ((g-b)/d + (g<b?6:0)); break;
        case g: h = ((b-r)/d + 2); break;
        case b: h = ((r-g)/d + 4); break;
      }
      h /= 6;
    }
    // Adjust lightness +/- in small controlled steps
    const offset = ((variantIndex % 4) - 1.5) * 0.12; // -0.18, -0.06, 0.06, 0.18 pattern
    let newL = Math.max(0.18, Math.min(0.82, l + offset));
    // Reconvert to RGB
    function hslToRgb(h:number,s:number,l:number){
      const hue2rgb = (p:number,q:number,t:number) => {
        if (t<0) t+=1; if (t>1) t-=1;
        if (t<1/6) return p + (q-p)*6*t;
        if (t<1/2) return q;
        if (t<2/3) return p + (q-p)*(2/3 - t)*6;
        return p;
      };
      if (s===0) { const v=Math.round(l*255); return [v,v,v]; }
      const q = l < 0.5 ? l*(1+s) : l + s - l*s;
      const p = 2*l - q;
      const r = Math.round(hue2rgb(p,q,h+1/3)*255);
      const g = Math.round(hue2rgb(p,q,h)*255);
      const b = Math.round(hue2rgb(p,q,h-1/3)*255);
      return [r,g,b];
    }
    const [nr,ng,nb] = hslToRgb(h,s,newL);
    return '#' + [nr,ng,nb].map(v=> v.toString(16).padStart(2,'0')).join('').toUpperCase();
  } catch {
    return hex; // fallback silently
  }
}

// Simple FNV-1a 32-bit hash for strings (stable across sessions)
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Ensure unsigned 32-bit
  return (h >>> 0);
}

// Convert hash to a stable numericId (base36 trimmed) ensuring it doesn't start with a hyphen
function hashToNumericId(str: string): string {
  const h = hashString(str);
  // base36 for compact representation; slice to limit length
  return h.toString(36);
}

// Deterministic mapping: pick base color via hash index, extend with shade variants if collisions grow.
function hashToModernColor(branch_id: string, occurrence: number): string {
  const h = hashString(branch_id);
  const baseIndex = h % BASE_PALETTE.length;
  const base = BASE_PALETTE[baseIndex];
  if (occurrence === 0) return base;
  // derive variant for subsequent branches that hash to same base index ordering by occurrence
  return deriveVariant(base, occurrence - 1);
}

export function sanitizeKey(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '_');
}

export function buildBranchMeta(branches: any[]): BranchMeta[] {
  // Track how many times we've assigned a base palette slot to vary shades deterministically
  const baseSlotCounts: Record<number, number> = {};
  return branches.map((b, idx) => {
    const rawId: string = b.branch_id || b.id || `BRANCH_${idx + 1}`;
    const branch_id = rawId.trim();
    const branch_name: string = b.branch_name || b.name || branch_id;
    const numericId = hashToNumericId(branch_id);
    const dataKey = sanitizeKey(branch_id);
    const baseIndex = hashString(branch_id) % BASE_PALETTE.length;
    const occurrence = baseSlotCounts[baseIndex] || 0;
    baseSlotCounts[baseIndex] = occurrence + 1;
    const color = hashToModernColor(branch_id, occurrence);
    return {
      numericId,
      branch_id,
      branch_name,
      color,
      dataKey,
      forecastKey: dataKey + '_FC',
    };
  });
}

export function buildTotalMeta(): BranchMeta {
  // Keep total color brand-specific; numericId stable constant 'total'
  return {
    numericId: 'total',
    branch_id: 'TOTAL',
    branch_name: 'Total of Branches',
    color: '#CE1616',
    dataKey: 'total',
    forecastKey: 'totalFC',
  };
}
