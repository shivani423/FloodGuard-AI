import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { get } from "../api";
import { Card, SeverityBadge } from "../components/ui.jsx";
import RiskMap from "../components/RiskMap.jsx";
import { avgCenter, sevStyle, sortByDistance } from "../lib/risk.js";

const ADVICE = {
  low: ["No immediate danger. Stay aware and keep an eye on updates."],
  moderate: ["Water is rising. Keep essentials ready."],
  high: ["High flood risk. Prepare to move to a safe place."],
  severe: ["Severe risk. Move to the nearest shelter now and follow official instructions."],
};
const CHECKLIST = [
  ["Keep documents, phone, medicines and drinking water ready"],
  ["Charge your phone and power bank"],
  ["Switch off electricity and gas before leaving"],
  ["Move to higher ground or the nearest shelter"],
  ["Never walk or drive through flood water"],
  ["Help children, elderly people and neighbours"],
  ["In an emergency call 112"],
];

export default function Evacuation() {
  const [params] = useSearchParams();
  const [zones, setZones] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [zoneId, setZoneId] = useState(params.get("zone") || "");
  const [me, setMe] = useState(null);
  const [done, setDone] = useState({});

  useEffect(() => {
    get("/api/overview").then((d) => { setZones(d.zones); setZoneId((z) => z || d.zones[0]?.zoneId || ""); }).catch(() => {});
    get("/api/shelters").then(setShelters).catch(() => {});
  }, []);

  const zone = zones.find((z) => z.zoneId === zoneId);
  const origin = me || (zone ? { lat: zone.lat, lng: zone.lng } : null);
  const list = origin ? sortByDistance(origin, shelters) : shelters;
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }));
  const dir = (s) => `https://www.google.com/maps/dir/?api=1${me ? `&origin=${me.lat},${me.lng}` : ""}&destination=${s.lat},${s.lng}&travelmode=walking`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">Emergency &amp; Evacuation Support</h2>
        <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="ml-auto rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm">
          {zones.map((z) => <option key={z.zoneId} value={z.zoneId}>{z.name}</option>)}
        </select>
      </div>

      {zone && (
        <div className="rounded-2xl border p-5" style={sevStyle(zone.severity)}>
          <div className="mb-1 flex items-center gap-2"><SeverityBadge severity={zone.severity} /><b>{zone.name}</b></div>
          <p>{ADVICE[zone.severity]?.[0]}</p>
          <p className="mt-1 opacity-90">{ADVICE[zone.severity]?.[1]}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card title="Nearest shelters">
            <button onClick={locate} className="mb-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">Use my location for distances</button>
            <ul className="space-y-3">
              {list.map((s) => (
                <li key={s._id} className="flex items-center justify-between gap-3 border-t border-slate-800 pt-3 first:border-0 first:pt-0">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-slate-400">Capacity {s.capacity} &middot; {s.contact}{s.km !== undefined && ` · ${s.km.toFixed(1)} km`}</div>
                  </div>
                  <a href={dir(s)} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white">Directions</a>
                </li>
              ))}
              {!list.length && <p className="text-slate-400">No shelters added yet.</p>}
            </ul>
          </Card>

          <Card title="Emergency checklist / आपातकालीन सूची">
            <ul className="space-y-3">
              {CHECKLIST.map(([en, hi], i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" className="mt-1" checked={!!done[i]} onChange={() => setDone({ ...done, [i]: !done[i] })} />
                    <span className={done[i] ? "line-through opacity-60" : ""}>{en}<br /><span className="text-sm text-slate-400">{hi}</span></span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">Emergency number in India: 112. Always follow instructions from local authorities.</p>
          </Card>
        </div>
        <RiskMap zones={zones} shelters={shelters} point={me} center={me ? [me.lat, me.lng] : avgCenter(zones)} height="560px" />
      </div>
    </div>
  );
}
