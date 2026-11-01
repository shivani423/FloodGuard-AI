import mongoose from "mongoose";
export default mongoose.model("Node", new mongoose.Schema({
  nodeId: { type: String, required: true, unique: true },
  name: String,
  zoneId: { type: String, required: true },
  lat: Number,
  lng: Number,
  simulated: { type: Boolean, default: false },
}, { timestamps: true }));
