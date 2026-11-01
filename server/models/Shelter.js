import mongoose from "mongoose";
export default mongoose.model("Shelter", new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  capacity: { type: Number, default: 0 },
  contact: String,
  zoneId: String,
}, { timestamps: true }));
