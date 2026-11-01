import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get, socket } from "../api";
import { Card, StatusCard, WaterGauge, SensorBadge, SeverityBadge, COLORS } from "../components/ui.jsx";
import LevelChart from "../components/LevelChart.jsx";
import { sevStyle } from "../lib/risk.js";

function WeatherCard({ w }) {
  if (!w) return <Card title="Weather"><p className="text-slate-400">Weather unavailable (no internet?). Admin can simulate rain.</p></Card>;
  const max = Math.max(1, ...w.hourly.map((h) => h.mm));
  return (
    <Card title="Rainfall">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["Now", w.rainNowMm, "mm/h"], ["Next 6h", w.next6hMm, "mm"], ["Next 24h", w.next24hMm, "mm"]].map(([l, v, u]) => (
          <div key={l}><div className="text-2xl font-bold">{(+v).toFixed(1)}</div><div className="text-xs text-slate-400">{l} ({u})</div></div>
        ))}
      </div>
      <div className="mt-3 flex h-16 items-end gap-0.5">
        {w.hourly.map((h, i) => (
          <div key={i} title={`${h.time}: ${h.mm} mm`} className="flex-1 rounded-t bg-sky-400/70" style={{ height: `${Math.max(4, (h.mm / max) * 100)}%` }} />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">{w.override ? "Simulated by admin (demo)" : "Forecast: Open-Meteo"}</p>
    </Card>
  );
}

export default function Dashboard() {
  const [ov, setOv] = useState(null);
  const [nodeId, setNodeId] = useState("node-1");
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState(null);
  const [pred, setPred] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const nodes = (ov?.zones || []).flatMap((z) => z.nodes.map((n) => ({ ...n, zone: z })));
  const cur = nodes.find((n) => n.nodeId === nodeId);
  const zone = cur?.zone;
  const latest = history[history.length - 1];

  useEffect(() => {
    const load = () => get("/api/overview").then(setOv).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    get("/api/settings").then(setSettings).catch(() => {});
    get("/api/alerts").then((a) => setAlerts(a.slice(0, 5))).catch(() => {});
    const onAlert = (a) => setAlerts((x) => [a, ...x].slice(0, 5));
    socket.on("alert:new", onAlert);
    return () => { clearInterval(id); socket.off("alert:new", onAlert); };
  }, []);

  useEffect(() => {
    get(`/api/readings?range=1h&nodeId=${nodeId}`).then(setHistory).catch(() => setHistory([]));
    const onR = (r) => { if (r.nodeId === nodeId) setHistory((h) => [...h.slice(-300), r]); };
    socket.on("reading:new", onR);
    const load = () => get(`/api/predict?nodeId=${nodeId}`).then(setPred).catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => { socket.off("reading:new", onR); clearInterval(id); };
  }, [nodeId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={nodeId} onChange={(e) => setNodeId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm">
          {(nodes.length ? nodes : [{ nodeId: "node-1", name: "node-1" }]).map((n) => <option key={n.nodeId} value={n.nodeId}>{n.name}</option>)}
        </select>
        <div className="ml-auto"><SensorBadge online={!!cur?.online} /></div>
      </div>

      {zone && (
        <div className="rounded-2xl border p-5" style={sevStyle(zone.severity)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest opacity-80">Flood risk &middot; {zone.name}</div>
              <div className="text-4xl font-extrabold uppercase">{zone.severity}</div>
            </div>
            <Link to={`/evacuation?zone=${zone.zoneId}`} className="rounded-lg border border-current px-3 py-2 text-sm font-medium">Evacuation info</Link>
          </div>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-200">
            {zone.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard reading={latest} />
        <WaterGauge reading={latest} />
        <Card title="AI Prediction">
          {!pred || pred.insufficient ? (
            <p className="text-slate-400">Insufficient data (need a few readings)</p>
          ) : (
            <div className="space-y-1 text-slate-200">
              <div>In 10 min: <b>{pred.in10.toFixed(1)} cm</b></div>
              <div>In 30 min: <b>{pred.in30.toFixed(1)} cm</b></div>
              <div>Trend: <b>{pred.ratePerMin >= 0 ? "+" : ""}{pred.ratePerMin.toFixed(2)} cm/min</b></div>
              {pred.severityML && <div className="flex items-center gap-2">AI risk view: <SeverityBadge severity={pred.severityML} /></div>}
              {pred.minutesToCritical !== undefined && <div className="text-yellow-400">Critical in ~{pred.minutesToCritical} min</div>}
              <p className="pt-2 text-xs text-slate-500">{pred.model}. Estimate only, not an official warning.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card title="Live Water Level (last hour)"><LevelChart data={history} settings={settings} /></Card>
        </div>
        <WeatherCard w={zone?.weather} />
      </div>

      <Card title="Recent Alerts">
        {alerts.length === 0 ? <p className="text-slate-400">No alerts yet.</p> : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a._id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2"><SeverityBadge severity={a.severity} />{a.message}</span>
                <span className="text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
