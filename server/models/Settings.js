import mongoose from "mongoose";
const s = new mongoose.Schema({
  tankHeightCm: { type: Number, default: 30 },
  sensorOffsetCm: { type: Number, default: 2 },
  warningLevelCm: { type: Number, default: 15 },
  criticalLevelCm: { type: Number, default: 22 },
  alertEmails: { type: [String], default: [] },
  emailCooldownMin: { type: Number, default: 5 },
});
const Settings = mongoose.model("Settings", s);
export async function getSettings() {
  return (await Settings.findOne()) || (await Settings.create({}));
}
export default Settings;
