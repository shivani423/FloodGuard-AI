import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get, socket } from "../api";
import { COLORS, Logo, SensorBadge, ThemeToggle, WaterTank } from "../components/ui.jsx";

const FEATURES = [
  ["📡", "Live Monitoring", "Water level updates on your dashboard every few seconds using Socket.IO, with history graphs."],
  ["🚦", "3-Level Status", "Normal, Warning and Critical zones with configurable thresholds for your tank or river model."],
  ["🔔", "LED + Buzzer Alerts", "The ESP32 triggers local LEDs and a buzzer, so alerts work even if Wi-Fi goes down."],
  ["✉️", "Email Notifications", "Automatic emails on Warning and Critical, with a cooldown so your inbox never gets spammed."],
  ["🤖", "AI Estimation", "A scikit-learn model estimates the level in 10 and 30 minutes and the time to critical."],
  ["📊", "History & CSV Export", "Review 1 hour, 24 hour or 7 day trends and export readings for reports."],
  ["🛡️", "Admin Dashboard", "Manage nodes, zones, shelters and thresholds, and send broadcast alerts."],
  ["🗺️", "Interactive Risk Map", "Zones colored Low, Moderate, High or Severe, with sensor nodes and shelters on a live map."],
  ["📍", "Location-based Warnings", "Subscribe with your location and get email alerts only for your zone."],
  ["🌧️", "Rainfall + Forecast", "Live rainfall and 24 hour forecast feed the severity score and the AI model."],
  ["🏫", "Evacuation Support", "Nearest shelters, directions, a bilingual checklist and emergency guidance."],
];

const STEPS = [
  ["01", "Sense", "An HC-SR04 ultrasonic sensor measures the distance to the water surface."],
  ["02", "Process", "The ESP32 filters the noise, controls LEDs/buzzer and sends the reading over Wi-Fi."],
  ["03", "Store & Predict", "Node.js validates and saves to MongoDB. Python ML estimates the future level."],
  ["04", "Alert", "The dashboard updates live and an email goes out when the level turns risky."],
];

const TECH = ["ESP32", "HC-SR04", "React", "Vite", "Tailwind CSS", "Node.js", "Express", "MongoDB", "Socket.IO", "Python", "scikit-learn", "Nodemailer"];

const FAQ = [
  ["Is this an official flood warning system?", "No. FloodGuard AI is a prototype for water-level monitoring and decision support. Always follow official government and disaster authority warnings."],
  ["How accurate is the AI prediction?", "It is a simple trend model that is only as good as its data. It is tested on actual or clearly labelled sample data and gives an estimate, not a guarantee."],
  ["What happens if Wi-Fi goes down?", "The ESP32 still drives the LEDs and buzzer locally from its own thresholds. The dashboard shows the sensor as offline until it reconnects."],
  ["Can I change the warning and critical levels?", "Yes. Open Settings in the dashboard to change tank height, sensor offset, thresholds, alert emails and cooldown."],
];

function useLatest() {
  const [r, setR] = useState(null);
  const [online, setOnline] = useState(false);
  useEffect(() => {
    get("/api/readings/latest").then((d) => d && setR(d)).catch(() => {});
    get("/api/device/status").then((d) => setOnline(d.online)).catch(() => {});
    const onR = (x) => { setR(x); setOnline(true); };
    const onS = () => get("/api/device/status").then((d) => setOnline(d.online)).catch(() => {});
    socket.on("reading:new", onR);
    socket.on("device:status", onS);
    return () => { socket.off("reading:new", onR); socket.off("device:status", onS); };
  }, []);
  return { r, online };
}

export default function Landing() {
  const { r, online } = useLatest();
  const st = r?.status || "normal";
  const pct = r ? r.levelPercent : 42;
  const color = COLORS[st].hex;

  return (
    <div className="hero-bg min-h-screen text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="#top"><Logo /></a>
          <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
            {[["#features", "Features"], ["#how", "How it works"], ["#live", "Live"], ["#tech", "Technology"], ["#faq", "FAQ"], ["#about", "About"]].map(([h, l]) => (
              <a key={h} href={h} className="hover:text-sky-400">{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/dashboard" className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400">Open Dashboard</Link>
          </div>
        </div>
      </header>

      <section id="top" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
            Early flood detection, <span className="grad-text">powered by IoT and AI</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            FloodGuard AI watches water levels in real time, warns you at danger levels and estimates where the level is heading next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/dashboard" className="rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-500/20">Live Dashboard</Link>
            <Link to="/map" className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 hover:bg-slate-800">Risk Map</Link>
            <Link to="/subscribe" className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 hover:bg-slate-800">Get Warnings</Link>
          </div>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
            {[["3", "Alert levels"], ["Live", "Socket.IO feed"], ["AI", "Level estimate"]].map(([a, b]) => (
              <div key={b} className="glass rounded-xl py-3"><div className="text-2xl font-bold grad-text">{a}</div><div className="text-xs text-slate-400">{b}</div></div>
            ))}
          </div>
        </div>

        <div className="floaty glass mx-auto w-full max-w-sm rounded-3xl p-6 shadow-2xl shadow-sky-500/10">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-400">Tank A &middot; ESP32</span>
            <SensorBadge online={online} />
          </div>
          <div className="flex items-end gap-6">
            <WaterTank percent={pct} color={color} className="h-52 w-28" />
            <div>
              <div className="text-5xl font-extrabold">{pct}<span className="text-2xl text-slate-400">%</span></div>
              <div className={`mt-1 text-sm font-bold uppercase ${COLORS[st].text}`}>{st}</div>
              <div className="mt-4 flex gap-2">
                {["normal", "warning", "critical"].map((k) => (
                  <span key={k} className="h-3 w-3 rounded-full" style={{ background: COLORS[k].hex, opacity: k === st ? 1 : 0.2, boxShadow: k === st ? `0 0 12px ${COLORS[k].hex}` : "none" }} />
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">{r ? "Live data from your sensor" : "Sample preview. Start the server to see live data."}</p>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <p className="text-3xl font-semibold uppercase tracking-widest text-sky-600">Features</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Everything you need to keep an eye on the water</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([icon, t, d]) => (
            <div key={t} className="glass rounded-2xl p-5 transition hover:-translate-y-1 hover:border-sky-500/40">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-sky-500/10 text-2xl">{icon}</div>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-slate-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <p className="text-2xl font-semibold uppercase tracking-widest text-emerald-400">How it works</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">From sensor to alert in four steps</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="glass relative rounded-2xl p-6">
              <div className="grad-text text-4xl font-extrabold">{n}</div>
              <h3 className="mt-2 text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-slate-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="live" className="mx-auto max-w-6xl px-4 py-16">
        <div className="glass rounded-3xl p-8 text-center md:p-12">
          <h2 className="text-3xl font-bold md:text-4xl">See it live</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">Open the dashboard to watch readings, graphs, AI estimates and alerts update in real time.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <SensorBadge online={online} />
            <span className={`rounded-full px-3 py-1 text-sm font-semibold uppercase ${COLORS[st].bg} ${COLORS[st].text}`}>{r ? `${st} · ${r.waterLevelCm} cm` : "waiting for data"}</span>
          </div>
          <Link to="/dashboard" className="mt-8 inline-block rounded-xl bg-sky-500 px-8 py-3 font-semibold text-white hover:bg-sky-400">Go to Dashboard</Link>
        </div>
      </section>

      <section id="tech" className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-2xl font-semibold uppercase tracking-widest text-sky-400">Technology</p>
        <h2 className="mt-2 text-3xl font-bold md:text-4xl">Hardware, full-stack web and machine learning</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {TECH.map((t) => <span key={t} className="glass rounded-full px-4 py-2 text-sm text-slate-200">{t}</span>)}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-200">
          <b>Important:</b> FloodGuard AI is a prototype for water-level monitoring and decision support. AI predictions are estimates based on actual or clearly labelled sample data. It is not a replacement for official flood warning systems.
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="glass rounded-xl p-4">
              <summary className="flex items-center justify-between font-medium">{q}<span className="chev text-sky-400 transition">&#9662;</span></summary>
              <p className="mt-3 text-sm text-slate-400">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">About the project</h2>
        <p className="mt-4 text-slate-300">
          FloodGuard AI is a college and science-exhibition project that combines a physical miniature flood-village model with a full-stack web app and machine learning, to show how low-cost IoT can support early flood awareness.
        </p>
        <p className="mt-3 text-sm text-slate-500">Built by Shivani AKS University &middot; www.linkedin.com/in/shivani-kurre-aa5832356</p>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        &copy; {new Date().getFullYear()} FloodGuard AI. Prototype for demonstration and learning.
      </footer>
    </div>
  );
}
