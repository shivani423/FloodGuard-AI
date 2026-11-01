
import Reading from "../models/Reading.js";
import Node from "../models/Node.js";
import Zone from "../models/Zone.js";
import Alert from "../models/Alert.js";
import Subscriber from "../models/Subscriber.js";
import { getSettings } from "../models/Settings.js";
import { classify, rank, slopePerMin } from "./risk.js";
import { getWeather } from "./weather.js";
import { sendBulk } from "./emailService.js";

const ORDER = { normal: 0, warning: 1, critical: 2 };

export async function nodeSnapshot(node) {
  const rows = (
    await Reading.find({ nodeId: node.nodeId })
      .sort({ createdAt: -1 })
      .limit(10)
  ).reverse();

  const latest = rows[rows.length - 1] || null;
  const age = latest ? Date.now() - latest.createdAt : Infinity;

  return {
    nodeId: node.nodeId,
    name: node.name,
    zoneId: node.zoneId,
    lat: node.lat,
    lng: node.lng,
    simulated: node.simulated,
    latest,
    online: age < 60000,
    fresh: age < 600000,
    ratePerMin: slopePerMin(rows),
  };
}

async function computeZone(zone, nodes) {
  const snaps = await Promise.all(
    nodes
      .filter((n) => n.zoneId === zone.zoneId)
      .map(nodeSnapshot)
  );

  const fresh = snaps.filter((s) => s.fresh && s.latest);

  const levelStatus = fresh.reduce(
    (w, s) =>
      ORDER[s.latest.status] > ORDER[w]
        ? s.latest.status
        : w,
    "normal"
  );

  const ratePerMin = fresh.length
    ? Math.max(...fresh.map((s) => s.ratePerMin))
    : 0;

  const weather = await getWeather(zone);

  const c = classify({
    levelStatus,
    ratePerMin,
    rain: weather,
    vulnerability: zone.vulnerability,
  });

  return {
    zoneId: zone.zoneId,
    name: zone.name,
    lat: zone.lat,
    lng: zone.lng,
    radiusM: zone.radiusM,
    population: zone.population,
    vulnerability: zone.vulnerability,
    levelStatus,
    ratePerMin,
    nodes: snaps,
    weather,
    ...c,
  };
}

export async function buildOverview() {
  const [zones, nodes] = await Promise.all([
    Zone.find().sort({ createdAt: 1 }),
    Node.find(),
  ]);

  return {
    zones: await Promise.all(
      zones.map((z) => computeZone(z, nodes))
    ),
    updatedAt: new Date(),
  };
}

export async function evaluateZone(zoneId, io) {
  const zone = await Zone.findOne({ zoneId });

  if (!zone) return;

  const res = await computeZone(
    zone,
    await Node.find({ zoneId })
  );

  const prev = zone.severity;
  let dirty = false;

  // Update zone severity when it changes.
  if (res.severity !== prev) {
    zone.severity = res.severity;
    dirty = true;

    io?.emit("zone:update", {
      zoneId,
      severity: res.severity,
      score: res.score,
      reasons: res.reasons,
    });
  }

  // Send alerts for High/Severe risk.
  // Also checks again after cooldown even if severity stays the same.
  if (rank(res.severity) >= 2) {
    await raiseAlert(zone, res, io);
    dirty = true;
  }

  if (dirty) {
    await zone.save();
  }
}

async function raiseAlert(zone, res, io) {
  const s = await getSettings();

  const cooldownMin = Number(s.emailCooldownMin) || 1;

  const cooled =
    !zone.lastAlertAt ||
    Date.now() - new Date(zone.lastAlertAt).getTime() >
      cooldownMin * 60000 ||
    rank(res.severity) > rank(zone.lastAlertSeverity);

  if (!cooled) return;

  const worst = res.nodes
    .filter((n) => n.latest)
    .sort(
      (a, b) =>
        b.latest.levelPercent - a.latest.levelPercent
    )[0];

  const message = `${res.severity.toUpperCase()} flood risk in ${
    zone.name
  }. ${res.reasons.join("; ")}.`;

  const subs = await Subscriber.find({
    zoneId: zone.zoneId,
  });

  const emails = [
    ...new Set([
      ...subs.map((x) => x.email).filter(Boolean),
      ...(s.alertEmails || []).filter(Boolean),
    ]),
  ];

  const body = [
    `FloodGuard AI - ${res.severity.toUpperCase()} risk: ${zone.name}`,
    "",
    ...res.reasons.map((r) => `- ${r}`),
    worst
      ? `\nLatest water level: ${worst.latest.waterLevelCm} cm (${worst.latest.levelPercent}%)`
      : "",
    `\nShelters and what to do: ${
      process.env.CLIENT_URL || "http://localhost:5173"
    }/evacuation?zone=${zone.zoneId}`,
    "\nThis is a prototype alert for demonstration. Always follow official instructions and call 112 in an emergency.",
  ].join("\n");

  const emailsSent = await sendBulk(
    emails,
    `FloodGuard AI - ${res.severity.toUpperCase()} risk: ${zone.name}`,
    body
  );

  const alert = await Alert.create({
    type: "auto",
    zoneId: zone.zoneId,
    zoneName: zone.name,
    severity: res.severity,
    message,
    emailsSent,
  });

  // Record the attempt time so repeated sensor readings
  // do not trigger emails continuously.
  zone.lastAlertAt = new Date();
  zone.lastAlertSeverity = res.severity;

  io?.emit("alert:new", alert);

  console.log(
    `[FloodGuard] ${res.severity.toUpperCase()} alert for ${zone.zoneId}: ${emailsSent} recipient(s) submitted.`
  );
}
