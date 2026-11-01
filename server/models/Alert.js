import mongoose from "mongoose";
export default mongoose.model("Alert", new mongoose.Schema({
  type: { type: String, enum: ["auto", "broadcast"], default: "auto" },
  zoneId: String,
  zoneName: String,
  severity: { type: String, enum: ["low", "moderate", "high", "severe"], required: true },
  message: String,
  emailsSent: { type: Number, default: 0 },
}, { timestamps: true }));
