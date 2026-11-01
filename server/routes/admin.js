import { Router } from "express";
import User from "../models/User.js";
import Node from "../models/Node.js";
import Zone from "../models/Zone.js";
import Shelter from "../models/Shelter.js";
import Subscriber from "../models/Subscriber.js";
import Alert from "../models/Alert.js";
import Reading from "../models/Reading.js";
import { getSettings } from "../models/Settings.js";
import { checkPassword, hashPassword, rateLimit, requireAdmin, signToken } from "../services/auth.js";
import { sendBulk, sendTest } from "../services/emailService.js";
import { clearOverride, getWeather, setOverride } from "../services/weather.js";
import { evaluateZone } from "../services/zones.js";
import { SEV } from "../services/risk.js";
import { pick, wrap } from "../utils/wrap.js";

const r = Router();
const authLimit = rateLimit(20, 15 * 60000);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Public auth routes ----------
r.get("/auth/status", wrap(async (req, res) => {
  const count = await User.countDocuments();
  res.json({ signupEnabled: count === 0 || !!process.env.ADMIN_SIGNUP_CODE, codeRequired: count > 0 || !!process.env.ADMIN_SIGNUP_CODE });
}));

r.post("/auth/signup", authLimit, wrap(async (req, res) => {
  const { name = "", email = "", password = "", code = "" } = req.body;
  const count = await User.countDocuments();
  const secret = process.env.ADMIN_SIGNUP_CODE;
  if (count > 0 && !secret) return res.status(403).json({ error: "Admin signup is disabled. Set ADMIN_SIGNUP_CODE in server/.env and restart the server." });
  if ((count > 0 || secret) && code !== secret) return res.status(403).json({ error: "Wrong signup code" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email" });
  if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: "This email is already registered. Please log in." });
  const user = await User.create({ name: String(name).slice(0, 80), email, passHash: hashPassword(String(password)) });
  res.status(201).json({ token: signToken(user), email: user.email });
}));

r.post("/auth/login", authLimit, wrap(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || "").toLowerCase() });
  if (!user || !checkPassword(String(req.body.password || ""), user.passHash))
    return res.status(401).json({ error: "Wrong email or password" });
  res.json({ token: signToken(user), email: user.email });
}));

// ---------- Admin only ----------
r.use(requireAdmin);

r.get("/auth/me", (req, res) => res.json({ email: req.admin.email }));
r.post("/auth/change-password", wrap(async (req, res) => {
  const { currentPassword = "", newPassword = "" } = req.body;
  const user = await User.findById(req.admin.sub);
  if (!user || !checkPassword(String(currentPassword), user.passHash)) return res.status(400).json({ error: "Current password is wrong" });
  if (String(newPassword).length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
  user.passHash = hashPassword(String(newPassword));
  await user.save();
  res.json({ ok: true });
}));

r.get("/users", wrap(async (q, s) => s.json(await User.find().select("-passHash").sort({ createdAt: 1 }))));
r.delete("/users/:id", wrap(async (req, res) => {
  if (req.params.id === req.admin.sub) return res.status(400).json({ error: "You cannot delete your own account" });
  if ((await User.countDocuments()) <= 1) return res.status(400).json({ error: "Cannot delete the last admin" });
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

function crud(path, Model, fields, { readOnly = false, sort = 1, clearAll = false } = {}) {
  r.get(`/${path}`, wrap(async (q, s) => s.json(await Model.find().sort({ createdAt: sort }).limit(500))));
  if (clearAll) r.delete(`/${path}`, wrap(async (q, s) => s.json({ deleted: (await Model.deleteMany({})).deletedCount })));
  r.delete(`/${path}/:id`, wrap(async (q, s) => { await Model.findByIdAndDelete(q.params.id); s.json({ ok: true }); }));
  if (readOnly) return;
  r.post(`/${path}`, wrap(async (q, s) => s.status(201).json(await Model.create(pick(q.body, fields)))));
  r.put(`/${path}/:id`, wrap(async (q, s) =>
    s.json(await Model.findByIdAndUpdate(q.params.id, pick(q.body, fields), { new: true, runValidators: true }))));
}
crud("nodes", Node, ["nodeId", "name", "zoneId", "lat", "lng", "simulated"]);
crud("zones", Zone, ["zoneId", "name", "lat", "lng", "radiusM", "population", "vulnerability"]);
crud("shelters", Shelter, ["name", "lat", "lng", "capacity", "contact", "zoneId"]);
crud("subscribers", Subscriber, [], { readOnly: true });
crud("alerts", Alert, [], { readOnly: true, sort: -1, clearAll: true });

r.delete("/readings", wrap(async (q, s) => s.json({ deleted: (await Reading.deleteMany({})).deletedCount })));

r.get("/settings", wrap(async (q, s) => s.json(await getSettings())));
r.put("/settings", wrap(async (q, s) => {
  const doc = await getSettings();
  Object.assign(doc, pick(q.body, ["tankHeightCm", "sensorOffsetCm", "warningLevelCm", "criticalLevelCm", "alertEmails", "emailCooldownMin"]));
  await doc.save();
  s.json(doc);
}));

r.post("/broadcast", wrap(async (req, res) => {
  const { zoneId = "all", severity = "high", message = "" } = req.body;
  if (!message.trim()) return res.status(400).json({ error: "Write a message" });
  if (!SEV.includes(severity)) return res.status(400).json({ error: "Bad severity" });
  const zone = zoneId === "all" ? null : await Zone.findOne({ zoneId });
  const subs = await Subscriber.find(zone ? { zoneId } : {});
  const emails = [...new Set(subs.map((x) => x.email))];
  const label = zone ? zone.name : "All zones";
  const sent = await sendBulk(emails, `FloodGuard AI broadcast - ${label}`, `${message}\n\n(Admin broadcast - FloodGuard AI prototype)`);
  const alert = await Alert.create({ type: "broadcast", zoneId: zone?.zoneId, zoneName: label, severity, message, emailsSent: sent });
  req.app.get("io").emit("alert:new", alert);
  res.json({ ok: true, recipients: emails.length, emailsSent: sent });
}));

// Demo ke liye: asli baarish na ho tab bhi heavy-rain scenario chalao
r.post("/weather/override", wrap(async (req, res) => {
  const { zoneId = "all", rainNowMm = 0, next6hMm = 0, next24hMm = 0, minutes = 60 } = req.body;
  const zones = zoneId === "all" ? await Zone.find() : await Zone.find({ zoneId });
  for (const z of zones) await setOverride(z.zoneId, { rainNowMm: +rainNowMm, next6hMm: +next6hMm, next24hMm: +next24hMm }, +minutes);
  for (const z of zones) await evaluateZone(z.zoneId, req.app.get("io"));
  res.json({ ok: true, zones: zones.length });
}));
r.delete("/weather/override", wrap(async (req, res) => {
  const zoneId = req.query.zoneId || "all";
  await clearOverride(zoneId);
  const zones = zoneId === "all" ? await Zone.find() : await Zone.find({ zoneId });
  for (const z of zones) await evaluateZone(z.zoneId, req.app.get("io"));
  res.json({ ok: true });
}));

// System check: sab kuch theek chal raha hai ya nahi
r.get("/system", wrap(async (req, res) => {
  const safe = async (fn) => { try { return await fn(); } catch (e) { return { ok: false, detail: e.message }; } };
  const ml = await safe(async () => {
    const x = await fetch(`${process.env.ML_URL || "http://localhost:8000"}/health`, { signal: AbortSignal.timeout(2000) });
    return { ok: x.ok, detail: x.ok ? "ML service running" : `HTTP ${x.status}` };
  });
  const zone = await Zone.findOne();
  const weather = zone
    ? await safe(async () => {
        const w = await getWeather(zone);
        return w ? { ok: true, detail: w.override ? "Simulated by admin (demo)" : `Live forecast (${w.source})` } : { ok: false, detail: "No weather data (no internet?). Use rain simulation." };
      })
    : { ok: false, detail: "No zones" };
  const nodes = await Node.find();
  const online = await Promise.all(nodes.map(async (n) => {
    const l = await Reading.findOne({ nodeId: n.nodeId }).sort({ createdAt: -1 });
    return !!l && Date.now() - l.createdAt < 60000;
  }));
  const smtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  res.json({ checks: [
    { name: "Database", ok: true, detail: "MongoDB connected" },
    { name: "ML service", ...ml },
    { name: "Weather", ...weather },
    { name: "Email (SMTP)", ok: smtp, detail: smtp ? `Configured (${process.env.SMTP_USER})` : "Not configured. Alerts are saved but emails are not sent." },
    { name: "Sensor nodes", ok: online.some(Boolean), detail: `${online.filter(Boolean).length} of ${nodes.length} online` },
    { name: "Subscribers", ok: true, detail: `${await Subscriber.countDocuments()} registered` },
  ] });
}));

r.post("/test-email", wrap(async (req, res) => {
  const to = String(req.body.to || "").trim();
  if (!EMAIL_RE.test(to)) return res.status(400).json({ error: "Enter a valid email" });
  const out = await sendTest(to);
  res.status(out.ok ? 200 : 400).json(out.ok ? out : { error: out.error });
}));

export default r;
