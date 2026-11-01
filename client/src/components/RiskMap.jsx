import { useEffect } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SEVERITY } from "../lib/risk.js";

const icon = (emoji) => L.divIcon({ html: `<div style="font-size:24px;line-height:28px">${emoji}</div>`, className: "", iconSize: [28, 28], iconAnchor: [14, 14] });
const shelterIcon = icon("🏫");
const pinIcon = icon("📍");
const STATUS_HEX = { normal: "#22c55e", warning: "#eab308", critical: "#ef4444" };

function Picker({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}
function View({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, zoom); }, [center?.[0], center?.[1], zoom]);
  return null;
}

export default function RiskMap({ zones = [], shelters = [], showShelters = true, point, onPick, center, zoom = 13, height = "480px" }) {
  const start = center || (zones[0] ? [zones[0].lat, zones[0].lng] : [24.6005, 80.8322]);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700" style={{ height }}>
      <MapContainer center={start} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <View center={center} zoom={zoom} />
        {onPick && <Picker onPick={onPick} />}

        {zones.map((z) => {
          const col = SEVERITY[z.severity]?.hex || SEVERITY.low.hex;
          return (
            <Circle key={z.zoneId} center={[z.lat, z.lng]} radius={z.radiusM || 800} pathOptions={{ color: col, fillColor: col, fillOpacity: 0.25 }}>
              <Popup>
                <b>{z.name}</b><br />
                Risk: <b style={{ color: col }}>{SEVERITY[z.severity]?.label}</b><br />
                {z.reasons?.[0]}
              </Popup>
            </Circle>
          );
        })}

        {zones.flatMap((z) => (z.nodes || []).map((n) => {
          const col = !n.online ? "#94a3b8" : STATUS_HEX[n.latest?.status] || "#94a3b8";
          return (
            <CircleMarker key={n.nodeId} center={[n.lat, n.lng]} radius={9} pathOptions={{ color: "#0f172a", weight: 2, fillColor: col, fillOpacity: 1 }}>
              <Popup>
                <b>{n.name}</b><br />
                {n.online ? "Online" : "Offline"}{n.simulated ? " (simulated)" : ""}<br />
                {n.latest ? `${n.latest.waterLevelCm} cm (${n.latest.levelPercent}%)` : "No data"}
              </Popup>
            </CircleMarker>
          );
        }))}

        {showShelters && shelters.map((s) => (
          <Marker key={s._id} position={[s.lat, s.lng]} icon={shelterIcon}>
            <Popup><b>{s.name}</b><br />Capacity: {s.capacity}<br />{s.contact}</Popup>
          </Marker>
        ))}

        {point && <Marker position={[point.lat, point.lng]} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}
