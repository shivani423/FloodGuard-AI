import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import { seedIfEmpty } from "./config/seed.js";
import readings from "./routes/readings.js";
import publicRoutes from "./routes/public.js";
import admin from "./routes/admin.js";
import Reading from "./models/Reading.js";
import Node from "./models/Node.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL } });
app.set("io", io);
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, project: "FloodGuard AI" }));
app.use("/api/readings", readings);
app.use("/api/admin", admin);
app.use("/api", publicRoutes);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

// Offline detection: har node ke liye, har 15s
const state = {};
setInterval(async () => {
  try {
    for (const n of await Node.find()) {
      const last = await Reading.findOne({ nodeId: n.nodeId }).sort({ createdAt: -1 });
      const online = !!last && Date.now() - last.createdAt < 60000;
      if (state[n.nodeId] !== online) {
        state[n.nodeId] = online;
        io.emit("device:status", { nodeId: n.nodeId, nodeOnline: online });
      }
    }
  } catch (e) { console.error("monitor:", e.message); }
}, 15000);

await connectDB();
await seedIfEmpty();
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
