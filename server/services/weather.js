import Weather from "../models/Weather.js";

const CACHE_MS = (Number(process.env.WEATHER_CACHE_MIN) || 15) * 60000;
const failedAt = {};
const plain = (w) => w && ({
  source: w.source, rainNowMm: w.rainNowMm, next6hMm: w.next6hMm, next24hMm: w.next24hMm,
  hourly: w.hourly, override: !!w.override, fetchedAt: w.fetchedAt,
});
const sum = (a, from, n) => a.slice(from, from + n).reduce((x, y) => x + (y || 0), 0);

export async function getWeather(zone) {
  const w = await Weather.findOne({ zoneId: zone.zoneId });
  if (w?.override && w.overrideUntil > new Date()) return plain(w);
  if (w && !w.override && w.fetchedAt && Date.now() - w.fetchedAt < CACHE_MS) return plain(w);
  const stale = w && !w.override ? plain(w) : null;
  // internet na ho to har reading par 4s wait na karein
  if (failedAt[zone.zoneId] && Date.now() - failedAt[zone.zoneId] < 120000) return stale;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${zone.lat}&longitude=${zone.lng}&current=precipitation&hourly=precipitation&forecast_days=2&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    const times = j.hourly.time, mm = j.hourly.precipitation;
    const nowLocal = Date.now() + (j.utc_offset_seconds || 0) * 1000;
    let i = 0;
    while (i + 1 < times.length && Date.parse(times[i + 1] + "Z") <= nowLocal) i++;
    const doc = await Weather.findOneAndUpdate({ zoneId: zone.zoneId }, {
      zoneId: zone.zoneId, source: "open-meteo", override: false, overrideUntil: null,
      rainNowMm: j.current?.precipitation ?? mm[i] ?? 0,
      next6hMm: +sum(mm, i, 6).toFixed(1),
      next24hMm: +sum(mm, i, 24).toFixed(1),
      hourly: times.slice(i, i + 24).map((t, k) => ({ time: t.slice(11, 16), mm: mm[i + k] || 0 })),
      fetchedAt: new Date(),
    }, { upsert: true, new: true });
    delete failedAt[zone.zoneId];
    return plain(doc);
  } catch (e) {
    failedAt[zone.zoneId] = Date.now();
    console.warn("Weather fetch failed:", e.message);
    return stale;
  }
}

export function setOverride(zoneId, { rainNowMm = 0, next6hMm = 0, next24hMm = 0 }, minutes = 60) {
  const hourly = Array.from({ length: 24 }, (_, k) => ({
    time: `+${k}h`,
    mm: +(k < 6 ? next6hMm / 6 : Math.max(0, next24hMm - next6hMm) / 18).toFixed(1),
  }));
  return Weather.findOneAndUpdate({ zoneId }, {
    zoneId, source: "simulated", override: true, overrideUntil: new Date(Date.now() + minutes * 60000),
    rainNowMm, next6hMm, next24hMm, hourly, fetchedAt: new Date(),
  }, { upsert: true, new: true });
}

export const clearOverride = (zoneId) =>
  Weather.updateMany(zoneId === "all" ? {} : { zoneId }, { override: false, overrideUntil: null, fetchedAt: null });
