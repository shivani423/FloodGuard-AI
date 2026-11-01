// Python ML service call karta hai; down ho to Node mein simple linear fit fallback.
function localFit(points) {
  const n = points.length, t0 = points[0].t;
  const xs = points.map((p) => (p.t - t0) / 60000), ys = points.map((p) => p.level);
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  const slope = den ? num / den : 0;
  const at = (m) => my + slope * (xs[n - 1] + m - mx);
  return { ratePerMin: slope, in10: at(10), in30: at(30), model: "linear-fit fallback (ML service offline)" };
}

export async function predict(points, ctx) {
  if (points.length < 5) return { insufficient: true };
  try {
    const r = await fetch(`${process.env.ML_URL || "http://localhost:8000"}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points, ...ctx }),
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) return await r.json();
  } catch {}
  return localFit(points);
}
