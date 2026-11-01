import mongoose from "mongoose";
export default mongoose.model("User", new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true, lowercase: true },
  passHash: { type: String, required: true },
  role: { type: String, default: "admin" },
}, { timestamps: true }));
