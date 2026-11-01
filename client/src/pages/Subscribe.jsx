
import { useEffect, useState } from "react";
import { get, post } from "../api";
import { Card, SeverityBadge } from "../components/ui.jsx";
import RiskMap from "../components/RiskMap.jsx";
import { avgCenter, sortByDistance } from "../lib/risk.js";

export default function Subscribe() {
  const [zones, setZones] = useState([]);
  const [point, setPoint] = useState(null);
  const [focus, setFocus] = useState(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    get("/api/overview")
      .then((d) => setZones(d.zones || []))
      .catch((err) => console.error("Could not load zones:", err));
  }, []);

  const nearest =
    point && zones.length ? sortByDistance(point, zones)[0] : null;

  const locate = () => {
    setMsg(null);

    if (!window.isSecureContext) {
      setMsg({
        ok: false,
        text: "Location requires HTTPS or localhost. Please open the app using localhost."
      });
      return;
    }

    if (!navigator.geolocation) {
      setMsg({
        ok: false,
        text: "Your browser does not support location detection."
      });
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pt = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setPoint(pt);
        setFocus([pt.lat, pt.lng]);
        setLocating(false);

        setMsg({
          ok: true,
          text: `Location detected successfully! Accuracy: approximately ${Math.round(position.coords.accuracy)} metres.`
        });
      },

      (error) => {
        setLocating(false);

        let message = "Unable to detect your location.";

        if (error.code === 1) {
          message =
            "Location permission denied. Allow location access in Chrome site settings and try again.";
        } else if (error.code === 2) {
          message =
            "Location is unavailable. Turn on device location services and try again.";
        } else if (error.code === 3) {
          message =
            "Location request timed out. Please try again.";
        }

        setMsg({ ok: false, text: message });
        console.error("Geolocation error:", error.code, error.message);
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!point) {
      setMsg({
        ok: false,
        text: "Please detect your location or select a point on the map."
      });
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const r = await post("/api/subscribe", {
        ...form,
        ...point
      });

      setMsg({
        ok: true,
        text: `Subscribed! You will get email warnings for ${r.zone.name}.`
      });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Get flood warnings for your area">
        <form onSubmit={submit} className="space-y-3">
          <input
            className={input}
            placeholder="Your name (optional)"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <input
            className={input}
            type="email"
            required
            placeholder="Email address"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-50"
            >
              {locating ? "Detecting location..." : "Use my location"}
            </button>

            <span className="text-sm text-slate-400">
              or click your location on the map
            </span>
          </div>

          {point && (
            <div className="rounded-lg bg-slate-800/60 p-3 text-sm">
              <p className="text-emerald-400 font-medium">
                Location selected
              </p>
              <p className="text-slate-300">
                Latitude: {point.lat.toFixed(6)}
              </p>
              <p className="text-slate-300">
                Longitude: {point.lng.toFixed(6)}
              </p>
            </div>
          )}

          {nearest && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 p-3 text-sm">
              Your zone:
              <b>{nearest.name}</b>
              <SeverityBadge severity={nearest.severity} />
            </div>
          )}

          <button
            disabled={busy || !point}
            className="rounded-lg bg-sky-500 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {busy ? "Subscribing..." : "Subscribe to alerts"}
          </button>

          {msg && (
            <p
              className={
                msg.ok ? "text-emerald-400" : "text-red-400"
              }
            >
              {msg.text}
            </p>
          )}
        </form>

        <p className="mt-4 text-xs text-slate-500">
          You get an email when your zone reaches High or Severe risk.
          Your email is used only for flood alerts. This is a prototype,
          not an official warning service.
        </p>
      </Card>

      <RiskMap
        zones={zones}
        showShelters={false}
        point={point}
        onPick={(pt) => {
          setPoint(pt);
          setFocus([pt.lat, pt.lng]);
          setMsg(null);
        }}
        center={focus || avgCenter(zones)}
        height="440px"
      />
    </div>
  );
}
