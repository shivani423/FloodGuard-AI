// Flood severity classification (rule-based, explainable).
// Rain thresholds IMD ki heavy/very-heavy categories ke approx hain (24h): 64.5 aur 115.6 mm.
export const SEV = ["low", "moderate", "high", "severe"];
export const rank = (s) => Math.max(0, SEV.indexOf(s));

export function classify({ levelStatus, ratePerMin, rain, vulnerability = 2 }) {
  const reasons = [];
  let score = 0;
  if (levelStatus === "critical") { score += 4; reasons.push("Water level is in the critical zone"); }
  else if (levelStatus === "warning") { score += 2; reasons.push("Water level is above the warning mark"); }

  if (ratePerMin > 3) { score += 2; reasons.push(`Water rising very fast (${ratePerMin.toFixed(1)} cm/min)`); }
  else if (ratePerMin > 1) { score += 1; reasons.push(`Water rising (${ratePerMin.toFixed(1)} cm/min)`); }

  const r24 = rain?.next24hMm ?? 0;
  const now = rain?.rainNowMm ?? 0;
  if (r24 >= 115.6) { score += 2; reasons.push(`Very heavy rain expected (${r24.toFixed(0)} mm in 24h)`); }
  else if (r24 >= 64.5) { score += 1; reasons.push(`Heavy rain expected (${r24.toFixed(0)} mm in 24h)`); }
  if (now >= 7.5) { score += 1; reasons.push(`Heavy rain right now (${now.toFixed(1)} mm/h)`); }

  if (vulnerability >= 3 && score > 0) { score += 1; reasons.push("Low-lying, high-vulnerability zone"); }

  const severity = score >= 6 ? "severe" : score >= 4 ? "high" : score >= 2 ? "moderate" : "low";
  if (!reasons.length) reasons.push("All indicators normal");
  return { score, severity, reasons };
}

export function slopePerMin(rows) {
  if (rows.length < 3) return 0;
  const t0 = rows[0].createdAt.getTime();
  const xs = rows.map((r) => (r.createdAt.getTime() - t0) / 60000);
  const ys = rows.map((r) => r.waterLevelCm);
  const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den ? num / den : 0;
}
