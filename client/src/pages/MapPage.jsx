import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get, socket } from "../api";
import { Card, SeverityBadge } from "../components/ui.jsx";
import RiskMap from "../components/RiskMap.jsx";
import { SEVERITY, avgCenter } from "../lib/risk.js";

export default function MapPage() {
  const [ov, setOv] = useState(null);
  const [shelters, setShelters] = useState([]);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const load = () => get("/api/overview").then(setOv).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    get("/api/shelters").then(setShelters).catch(() => {});
    socket.on("zone:update", load);
    return () => { clearInterval(id); socket.off("zone:update", load); };
  }, []);

  const zones = ov?.zones || [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">Flood Risk Map</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          {Object.entries(SEVERITY).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: v.hex }} />{v.label}</span>
          ))}
          <label className="ml-3 flex items-center gap-1"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Shelters</label>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RiskMap zones={zones} shelters={shelters} showShelters={show} center={avgCenter(zones)} />
          <p className="mt-2 text-xs text-slate-500">Zone circles show flood risk. Dots are sensor nodes (grey = offline). Demo data. Map tiles need internet.</p>
        </div>
        <div className="space-y-3">
          {zones.map((z) => (
            <Card key={z.zoneId}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{z.name}</div>
                <SeverityBadge severity={z.severity} />
              </div>
              <p className="mt-2 text-sm text-slate-400">{z.reasons?.[0]}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Rain 24h: {z.weather ? `${z.weather.next24hMm} mm` : "n/a"}</span>
                <Link to={`/evacuation?zone=${z.zoneId}`} className="text-sky-400 hover:underline">Evacuation info</Link>
              </div>
            </Card>
          ))}
          {!zones.length && <p className="text-slate-400">Loading zones... (is the server running?)</p>}
        </div>
      </div>
    </div>
  );
}
