// import { Router } from "express";
// import Reading from "../models/Reading.js";
// import Node from "../models/Node.js";
// import Zone from "../models/Zone.js";
// import { getSettings } from "../models/Settings.js";
// import deviceAuth from "../middleware/deviceAuth.js";
// import { evaluateZone } from "../services/zones.js";
// import { wrap } from "../utils/wrap.js";

// const router = Router();
// const RANGES = { "1h": 3600e3, "24h": 86400e3, "7d": 7 * 86400e3 };

// export function computeLevel(distance, s) {
//   let level = s.tankHeightCm - (distance - s.sensorOffsetCm);
//   level = Math.max(0, Math.min(s.tankHeightCm, level));
//   const status = level >= s.criticalLevelCm ? "critical" : level >= s.warningLevelCm ? "warning" : "normal";
//   return { level: +level.toFixed(1), percent: +((level / s.tankHeightCm) * 100).toFixed(1), status };
// }

// router.post("/", deviceAuth, wrap(async (req, res) => {
//   const nodeId = req.body.nodeId || "node-1";
//   const node = await Node.findOne({ nodeId });
//   if (!node) return res.status(404).json({ error: `Unknown nodeId "${nodeId}". Add it in Admin > Nodes.` });
//   const distance = Number(req.body.distanceCm);
//   if (!Number.isFinite(distance) || distance < 2 || distance > 400)
//     return res.status(400).json({ error: "Invalid distanceCm (2-400)" });

//   const s = await getSettings();
//   const { level, percent, status } = computeLevel(distance, s);
//   const reading = await Reading.create({ nodeId, deviceId: req.body.deviceId || nodeId, distanceCm: distance, waterLevelCm: level, levelPercent: percent, status });
//   const io = req.app.get("io");
//   io.emit("reading:new", reading);
//   await evaluateZone(node.zoneId, io);
//   const zone = await Zone.findOne({ zoneId: node.zoneId });
//   res.status(201).json({ status, severity: zone?.severity, waterLevelCm: level, levelPercent: percent });
// }));

// router.get("/latest", wrap(async (req, res) => {
//   res.json(await Reading.findOne({ nodeId: req.query.nodeId || "node-1" }).sort({ createdAt: -1 }));
// }));

// router.get("/export", wrap(async (req, res) => {
//   const filter = req.query.nodeId && req.query.nodeId !== "all" ? { nodeId: req.query.nodeId } : {};
//   const rows = await Reading.find(filter).sort({ createdAt: -1 }).limit(5000);
//   const csv = ["time,nodeId,distanceCm,waterLevelCm,levelPercent,status",
//     ...rows.map((r) => `${r.createdAt.toISOString()},${r.nodeId},${r.distanceCm},${r.waterLevelCm},${r.levelPercent},${r.status}`)].join("\n");
//   res.header("Content-Type", "text/csv").attachment("floodguard-readings.csv").send(csv);
// }));

// router.get("/", wrap(async (req, res) => {
//   const ms = RANGES[req.query.range] || RANGES["1h"];
//   const rows = await Reading.find({ nodeId: req.query.nodeId || "node-1", createdAt: { $gte: new Date(Date.now() - ms) } }).sort({ createdAt: 1 }).limit(2000);
//   res.json(rows);
// }));

// export default router;



import { Router } from "express";
import Reading from "../models/Reading.js";
import Node from "../models/Node.js";
import Zone from "../models/Zone.js";
import { getSettings } from "../models/Settings.js";
import deviceAuth from "../middleware/deviceAuth.js";
import { evaluateZone } from "../services/zones.js";
import { wrap } from "../utils/wrap.js";

const router = Router();

const RANGES = {
  "1h": 3600e3,
  "24h": 86400e3,
  "7d": 7 * 86400e3
};

export function computeLevel(distance, s) {
  let level = s.tankHeightCm - (distance - s.sensorOffsetCm);

  level = Math.max(0, Math.min(s.tankHeightCm, level));

  const status =
    level >= s.criticalLevelCm
      ? "critical"
      : level >= s.warningLevelCm
        ? "warning"
        : "normal";

  return {
    level: +level.toFixed(1),
    percent: +((level / s.tankHeightCm) * 100).toFixed(1),
    status
  };
}

// ESP32 sensor data receive endpoint
router.post("/", deviceAuth, wrap(async (req, res) => {
  const nodeId = req.body.nodeId || "node-1";

  const node = await Node.findOne({ nodeId });

  if (!node) {
    return res.status(404).json({
      error: `Unknown nodeId "${nodeId}". Add it in Admin > Nodes.`
    });
  }

  // Validate ultrasonic sensor distance
  const distance = Number(req.body.distanceCm);

  if (!Number.isFinite(distance) || distance < 2 || distance > 400) {
    return res.status(400).json({
      error: "Invalid distanceCm (2-400)"
    });
  }

  // Validate optional rain sensor value
  let rainValue = null;

  if (req.body.rainValue !== undefined && req.body.rainValue !== null) {
    rainValue = Number(req.body.rainValue);

    if (!Number.isFinite(rainValue)) {
      return res.status(400).json({
        error: "Invalid rainValue"
      });
    }
  }

  const rainDetected = req.body.rainDetected === true;

  // Calculate water level using saved Admin settings
  const settings = await getSettings();

  const {
    level,
    percent,
    status
  } = computeLevel(distance, settings);

  // Save both water and rain sensor readings
  const reading = await Reading.create({
    nodeId,
    deviceId: req.body.deviceId || nodeId,
    distanceCm: distance,
    waterLevelCm: level,
    levelPercent: percent,
    status,
    rainDetected,
    rainValue
  });

  // Send live update to dashboard
  const io = req.app.get("io");

  io.emit("reading:new", reading);

  await evaluateZone(node.zoneId, io);

  const zone = await Zone.findOne({
    zoneId: node.zoneId
  });

  return res.status(201).json({
    message: "Sensor reading saved successfully",
    status,
    severity: zone?.severity,
    waterLevelCm: level,
    levelPercent: percent,
    rainDetected,
    rainValue
  });
}));

// Latest reading
router.get("/latest", wrap(async (req, res) => {
  const reading = await Reading.findOne({
    nodeId: req.query.nodeId || "node-1"
  }).sort({ createdAt: -1 });

  res.json(reading);
}));

// Export readings as CSV
router.get("/export", wrap(async (req, res) => {
  const filter =
    req.query.nodeId && req.query.nodeId !== "all"
      ? { nodeId: req.query.nodeId }
      : {};

  const rows = await Reading.find(filter)
    .sort({ createdAt: -1 })
    .limit(5000);

  const csv = [
    "time,nodeId,distanceCm,waterLevelCm,levelPercent,status,rainDetected,rainValue",
    ...rows.map((r) =>
      `${r.createdAt.toISOString()},${r.nodeId},${r.distanceCm},${r.waterLevelCm},${r.levelPercent},${r.status},${r.rainDetected},${r.rainValue ?? ""}`
    )
  ].join("\n");

  res
    .header("Content-Type", "text/csv")
    .attachment("floodguard-readings.csv")
    .send(csv);
}));

// Historical readings
router.get("/", wrap(async (req, res) => {
  const ms = RANGES[req.query.range] || RANGES["1h"];

  const rows = await Reading.find({
    nodeId: req.query.nodeId || "node-1",
    createdAt: {
      $gte: new Date(Date.now() - ms)
    }
  })
    .sort({ createdAt: 1 })
    .limit(2000);

  res.json(rows);
}));

export default router;
