import mongoose from "mongoose";
export default mongoose.model("Weather", new mongoose.Schema({
  zoneId: { type: String, required: true, unique: true },
  source: String,
  rainNowMm: { type: Number, default: 0 },
  next6hMm: { type: Number, default: 0 },
  next24hMm: { type: Number, default: 0 },
  hourly: [{ time: String, mm: Number, _id: false }],
  override: { type: Boolean, default: false },
  overrideUntil: Date,
  fetchedAt: Date,
}));
