// Fake nodes: paani badhta/ghat-ta hai. Run: npm run simulate
// Asli ESP32 (node-1) chalane ke baad: npm run simulate:virtual  (sirf sim-2/3/4)
const URL = process.env.API || "http://localhost:5000/api/readings";
const KEY = process.env.DEVICE_API_KEY;

if (!KEY) {
  throw new Error("DEVICE_API_KEY is missing in environment variables");
}
const SPEED = Number(process.env.SPEED) || 1;
const virtualOnly = process.argv.includes("--virtual-only");
const TANK = 30, OFFSET = 2;

const NODES = [
  { id: "node-1", base: 8, amp: 16, period: 55, phase: 0 },
  { id: "sim-2", base: 9, amp: 18, period: 45, phase: 25 },
  { id: "sim-3", base: 6, amp: 7, period: 60, phase: 80 },
  { id: "sim-4", base: 10, amp: 13, period: 50, phase: 10 },
].filter((n) => !(virtualOnly && n.id === "node-1"));

let t = 0;
async function tick() {
  t += SPEED;
  for (const n of NODES) {
    const level = n.base + n.amp * (0.5 - 0.5 * Math.cos((t + n.phase) / n.period)) + (Math.random() - 0.5) * 0.5;
    const distanceCm = +(TANK + OFFSET - level).toFixed(1);
    try {
      const r = await fetch(URL, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": KEY }, body: JSON.stringify({ nodeId: n.id, distanceCm }) });
      const j = await r.json();
      console.log(n.id.padEnd(7), String(distanceCm).padStart(5), "->", j.status ?? j.error, j.severity ? `| zone: ${j.severity}` : "");
    } catch (e) { console.log("Server down?", e.message, e.cause?.code ?? ""); }
  }
}
setInterval(tick, 3000);
console.log(`Simulating: ${NODES.map((n) => n.id).join(", ")}`);
