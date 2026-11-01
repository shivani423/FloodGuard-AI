// import mongoose from "mongoose";
// const s = new mongoose.Schema({
//   nodeId: { type: String, default: "node-1" },
//   deviceId: { type: String, default: "esp32-01" },
//   distanceCm: { type: Number, required: true },
//   waterLevelCm: { type: Number, required: true },
//   levelPercent: { type: Number, required: true },
//   status: { type: String, enum: ["normal", "warning", "critical"], required: true },
// }, { timestamps: true });
// s.index({ nodeId: 1, createdAt: -1 });
// export default mongoose.model("Reading", s);



import mongoose from "mongoose";

const s = new mongoose.Schema({
  nodeId: { type: String, default: "node-1" },
  deviceId: { type: String, default: "esp32-01" },

  // Ultrasonic sensor data
  distanceCm: { type: Number, required: true },
  waterLevelCm: { type: Number, required: true },
  levelPercent: { type: Number, required: true },

  // Water-level status
  status: {
    type: String,
    enum: ["normal", "warning", "critical"],
    required: true
  },

  // Rain sensor data
  rainDetected: { type: Boolean, default: false },
  rainValue: { type: Number, default: null }
}, { timestamps: true });

s.index({ nodeId: 1, createdAt: -1 });

export default mongoose.model("Reading", s);
