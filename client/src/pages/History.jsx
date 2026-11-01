import { useEffect, useState } from "react";
import { API, get } from "../api";
import { Card } from "../components/ui.jsx";
import LevelChart from "../components/LevelChart.jsx";

export default function History() {
  const [range, setRange] = useState("24h");
  const [nodeId, setNodeId] = useState("node-1");
  const [nodes, setNodes] = useState([]);
  const [data, setData] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    get("/api/settings").then(setSettings).catch(() => {});
    get("/api/overview").then((d) => setNodes(d.zones.flatMap((z) => z.nodes))).catch(() => {});
  }, []);
  useEffect(() => { get(`/api/readings?range=${range}&nodeId=${nodeId}`).then(setData).catch(() => setData([])); }, [range, nodeId]);

  return (
    <Card title="History">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={nodeId} onChange={(e) => setNodeId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm">
          {(nodes.length ? nodes : [{ nodeId: "node-1", name: "node-1" }]).map((n) => <option key={n.nodeId} value={n.nodeId}>{n.name}</option>)}
        </select>
        {["1h", "24h", "7d"].map((r) => (
          <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-3 py-1 text-sm ${range === r ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300"}`}>{r}</button>
        ))}
        <a href={`${API}/api/readings/export?nodeId=${nodeId}`} className="ml-auto rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white">Export CSV</a>
      </div>
      <LevelChart data={data} settings={settings} height={380} />
      <p className="mt-2 text-xs text-slate-500">{data.length} readings</p>
    </Card>
  );
}
