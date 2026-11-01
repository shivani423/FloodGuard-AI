export const SEVERITY = {
  low: { label: "Low", hex: "#22c55e", v: "--sev-low" },
  moderate: { label: "Moderate", hex: "#eab308", v: "--sev-moderate" },
  high: { label: "High", hex: "#f97316", v: "--sev-high" },
  severe: { label: "Severe", hex: "#ef4444", v: "--sev-severe" },
};

export const sevStyle = (s) => {
  const v = `var(${(SEVERITY[s] || SEVERITY.low).v})`;
  return {
    color: v,
    background: `color-mix(in srgb, ${v} 14%, transparent)`,
    borderColor: `color-mix(in srgb, ${v} 45%, transparent)`,
  };
};

export function distKm(a, b) {
  const R = 6371, r = (x) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const sortByDistance = (p, list) =>
  list.map((x) => ({ ...x, km: distKm(p, x) })).sort((a, b) => a.km - b.km);

export const avgCenter = (zones) =>
  zones.length ? [zones.reduce((s, z) => s + z.lat, 0) / zones.length, zones.reduce((s, z) => s + z.lng, 0) / zones.length] : null;
