import Zone from "../models/Zone.js";
import Node from "../models/Node.js";
import Shelter from "../models/Shelter.js";
import User from "../models/User.js";
import { hashPassword } from "../services/auth.js";

// DEMO data hai (Satna, MP ke aas-paas): zone/shelter ke naam aur positions sample hain. Admin panel se asli areas ke naam daalo.
export async function seedIfEmpty() {
  if (!(await Zone.countDocuments())) {
    await Zone.insertMany([
      { zoneId: "zone-a", name: "Zone A - Riverside Colony (demo)", lat: 24.6005, lng: 80.8322, radiusM: 900, population: 4200, vulnerability: 3 },
      { zoneId: "zone-b", name: "Zone B - Low-lying Market (demo)", lat: 24.6159, lng: 80.8545, radiusM: 800, population: 6500, vulnerability: 3 },
      { zoneId: "zone-c", name: "Zone C - Hillside Village (demo)", lat: 24.5859, lng: 80.8095, radiusM: 700, population: 1800, vulnerability: 1 },
      { zoneId: "zone-d", name: "Zone D - Lake Edge Ward (demo)", lat: 24.6109, lng: 80.8095, radiusM: 750, population: 3100, vulnerability: 2 },
    ]);
    console.log("Seeded demo zones");
  }
  if (!(await Node.countDocuments())) {
    await Node.insertMany([
      { nodeId: "node-1", name: "Node 1 - ESP32 (real sensor)", zoneId: "zone-a", lat: 24.6009, lng: 80.8325, simulated: false },
      { nodeId: "sim-2", name: "Node 2 (simulated)", zoneId: "zone-b", lat: 24.6161, lng: 80.8548, simulated: true },
      { nodeId: "sim-3", name: "Node 3 (simulated)", zoneId: "zone-c", lat: 24.5861, lng: 80.8098, simulated: true },
      { nodeId: "sim-4", name: "Node 4 (simulated)", zoneId: "zone-d", lat: 24.6111, lng: 80.8097, simulated: true },
    ]);
    console.log("Seeded demo nodes");
  }
  if (!(await Shelter.countDocuments())) {
    await Shelter.insertMany([
      { name: "Govt. School (demo)", lat: 24.6049, lng: 80.8395, capacity: 300, contact: "000-000-0000", zoneId: "zone-a" },
      { name: "Community Hall (demo)", lat: 24.6209, lng: 80.8595, capacity: 200, contact: "000-000-0000", zoneId: "zone-b" },
      { name: "College Ground (demo)", lat: 24.5909, lng: 80.8195, capacity: 500, contact: "000-000-0000", zoneId: "zone-c" },
      { name: "Panchayat Bhawan (demo)", lat: 24.6059, lng: 80.8045, capacity: 150, contact: "000-000-0000", zoneId: "zone-d" },
    ]);
    console.log("Seeded demo shelters");
  }
  // Default admin sirf tab banta hai jab SEED_DEFAULT_ADMIN=true ho. Warna pehla admin /admin par Sign up se banta hai.
  if (process.env.SEED_DEFAULT_ADMIN === "true" && !(await User.countDocuments())) {
    const email = (process.env.ADMIN_EMAIL || "admin@floodguard.local").toLowerCase();
    await User.create({ name: "Admin", email, passHash: hashPassword(process.env.ADMIN_PASSWORD || "admin123") });
    console.log(`Default admin created: ${email}`);
  }
}