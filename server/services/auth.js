import crypto from "crypto";
import jwt from "jsonwebtoken";

const secret = () => process.env.JWT_SECRET || "dev-secret-change-me";

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(pw, salt, 32).toString("hex")}`;
}
export function checkPassword(pw, stored) {
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(pw, salt, 32);
  return crypto.timingSafeEqual(test, Buffer.from(hash, "hex"));
}
export const signToken = (u) => jwt.sign({ sub: String(u._id), email: u.email }, secret(), { expiresIn: "12h" });

export function requireAdmin(req, res, next) {
  try {
    req.admin = jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), secret());
    next();
  } catch {
    res.status(401).json({ error: "Admin login required" });
  }
}

// Brute-force se bachne ke liye simple limiter (memory mein)
export function rateLimit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const arr = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    arr.push(now);
    hits.set(req.ip, arr);
    next();
  };
}
