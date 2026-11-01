import { Router } from "express";
import Alert from "../models/Alert.js";
import Reading from "../models/Reading.js";
import Node from "../models/Node.js";
import Zone from "../models/Zone.js";
import Shelter from "../models/Shelter.js";
import Subscriber from "../models/Subscriber.js";
import { getSettings } from "../models/Settings.js";
import { buildOverview } from "../services/zones.js";
import { getWeather } from "../services/weather.js";
import { predict } from "../services/mlService.js";
import { wrap } from "../utils/wrap.js";

const r = Router();

r.get("/overview", wrap(async (req, res) => res.json(await buildOverview())));
r.get("/shelters", wrap(async (req, res) => res.json(await Shelter.find().sort({ createdAt: 1 }))));
r.get("/alerts", wrap(async (req, res) => {
  const f = req.query.zoneId ? { zoneId: req.query.zoneId } : {};
  res.json(await Alert.find(f).sort({ createdAt: -1 }).limit(100));
}));

r.get("/settings", wrap(async (req, res) => {
  const s = await getSettings();
  res.json({ tankHeightCm: s.tankHeightCm, sensorOffsetCm: s.sensorOffsetCm, warningLevelCm: s.warningLevelCm, criticalLevelCm: s.criticalLevelCm });
}));

const dist = (a, b) => (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2;
r.post("/subscribe", wrap(async (req, res) => {
  const { name = "", email = "", lat, lng } = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email" });
  let zone = req.body.zoneId ? await Zone.findOne({ zoneId: req.body.zoneId }) : null;
  if (!zone && Number.isFinite(+lat) && Number.isFinite(+lng)) {
    const zones = await Zone.find();
    zone = zones.sort((a, b) => dist(a, { lat, lng }) - dist(b, { lat, lng }))[0];
  }
  if (!zone) return res.status(400).json({ error: "Choose a location or zone" });
  await Subscriber.findOneAndUpdate({ email: email.toLowerCase(), zoneId: zone.zoneId },
    { name: String(name).slice(0, 80), lat: Number.isFinite(+lat) ? +lat : undefined, lng: Number.isFinite(+lng) ? +lng : undefined },
    { upsert: true, new: true });
  res.status(201).json({ ok: true, zone: { zoneId: zone.zoneId, name: zone.name, severity: zone.severity } });
}));

r.get("/predict", wrap(async (req, res) => {
  const nodeId = req.query.nodeId || "node-1";
  const node = await Node.findOne({ nodeId });
  const rows = (await Reading.find({ nodeId }).sort({ createdAt: -1 }).limit(30)).reverse();
  const s = await getSettings();
  const zone = node && (await Zone.findOne({ zoneId: node.zoneId }));
  const w = zone ? await getWeather(zone) : null;
  const out = await predict(rows.map((x) => ({ t: x.createdAt.getTime(), level: x.waterLevelCm })), {
    tankHeightCm: s.tankHeightCm,
    vulnerability: zone?.vulnerability ?? 2,
    rain: { now: w?.rainNowMm ?? 0, next6h: w?.next6hMm ?? 0, next24h: w?.next24hMm ?? 0 },
  });
  if (!out.insufficient && out.ratePerMin > 0.001 && rows.length) {
    const cur = rows[rows.length - 1].waterLevelCm;
    out.minutesToCritical = cur >= s.criticalLevelCm ? 0 : +((s.criticalLevelCm - cur) / out.ratePerMin).toFixed(1);
  }
  res.json(out);
}));

r.get("/device/status", wrap(async (req, res) => {
  const nodes = await Node.find();
  const list = await Promise.all(nodes.map(async (n) => {
    const last = await Reading.findOne({ nodeId: n.nodeId }).sort({ createdAt: -1 });
    return { nodeId: n.nodeId, online: !!last && Date.now() - last.createdAt < 60000, lastSeen: last?.createdAt || null };
  }));
  res.json({ online: list.some((x) => x.online), nodes: list });
}));

export default r;
