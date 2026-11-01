import mongoose from "mongoose";
const s = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  name: String,
  zoneId: { type: String, required: true },
  lat: Number,
  lng: Number,
}, { timestamps: true });
s.index({ email: 1, zoneId: 1 }, { unique: true });
export default mongoose.model("Subscriber", s);
