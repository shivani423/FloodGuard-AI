import mongoose from "mongoose";
export default mongoose.model("Zone", new mongoose.Schema({
  zoneId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radiusM: { type: Number, default: 800 },
  population: { type: Number, default: 0 },
  vulnerability: { type: Number, min: 1, max: 3, default: 2 },
  severity: { type: String, default: "low" },
  lastAlertSeverity: { type: String, default: "low" },
  lastAlertAt: Date,
}, { timestamps: true }));
