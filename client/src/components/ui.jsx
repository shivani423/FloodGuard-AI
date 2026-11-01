import { useTheme } from "../theme.js";
import { SEVERITY, sevStyle } from "../lib/risk.js";

export const COLORS = {
  normal: { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "border-emerald-500/40", hex: "#34d399" },
  warning: { bg: "bg-yellow-500/10", text: "text-yellow-400", ring: "border-yellow-500/40", hex: "#facc15" },
  critical: { bg: "bg-red-500/10", text: "text-red-400", ring: "border-red-500/40", hex: "#f87171" },
};

export const Card = ({ title, children, className = "" }) => (
  <div className={`glass rounded-2xl p-5 ${className}`}>
    {title && <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</h3>}
    {children}
  </div>
);

export function StatusCard({ reading }) {
  const st = reading?.status || "normal";
  const c = COLORS[st];
  return (
    <Card title="Status" className={`${c.bg} ${c.ring} ${st === "critical" ? "animate-pulse" : ""}`}>
      <div className={`text-4xl font-bold uppercase ${c.text}`}>{reading ? st : "No data"}</div>
      <div className="mt-2 text-slate-300">
        {reading ? `${reading.waterLevelCm} cm (${reading.levelPercent}%)` : "Waiting for sensor..."}
      </div>
    </Card>
  );
}

export function WaterTank({ percent = 0, color = "#38bdf8", className = "h-48 w-28" }) {
  const y = 100 - Math.min(100, Math.max(0, percent));
  const path = "M0 6 Q 12.5 0 25 6 T 50 6 T 75 6 T 100 6 V 120 H 0 Z";
  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 border-slate-600/70 bg-slate-900/80 ${className}`}>
      <div className="absolute left-0 w-full transition-all duration-700" style={{ top: `${y}%`, height: "120%" }}>
        <svg className="wave absolute -top-1 h-6 w-[200%]" viewBox="0 0 100 12" preserveAspectRatio="none" style={{ fill: color, opacity: 0.55 }}>
          <path d="M0 6 Q 12.5 0 25 6 T 50 6 T 75 6 T 100 6 T 125 6 T 150 6 T 175 6 T 200 6 V 12 H 0 Z" transform="scale(1 1)" />
        </svg>
        <svg className="wave2 absolute top-0 h-6 w-[200%]" viewBox="0 0 100 12" preserveAspectRatio="none" style={{ fill: color, opacity: 0.9 }}>
          <path d="M0 6 Q 12.5 0 25 6 T 50 6 T 75 6 T 100 6 T 125 6 T 150 6 T 175 6 T 200 6 V 12 H 0 Z" />
        </svg>
        <div className="absolute inset-0 top-4" style={{ background: color, opacity: 0.85 }} />
      </div>
    </div>
  );
}

export function WaterGauge({ reading }) {
  const pct = reading?.levelPercent || 0;
  const hex = COLORS[reading?.status || "normal"].hex;
  return (
    <Card title="Tank Level">
      <div className="flex items-end gap-5">
        <WaterTank percent={pct} color={hex} className="h-40 w-24" />
        <div className="text-4xl font-bold">{pct}%</div>
      </div>
    </Card>
  );
}

export function SensorBadge({ online }) {
  return (
    <span className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${online ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
      <span className="relative flex h-2 w-2">
        {online && <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-red-400"}`} />
      </span>
      Sensor {online ? "Online" : "Offline"}
    </span>
  );
}

export const Logo = () => (
  <span className="flex items-center gap-2 text-lg font-bold">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-900">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2c3.5 4.6 6 7.8 6 11a6 6 0 0 1-12 0c0-3.2 2.5-6.4 6-11Z" /></svg>
    </span>
    FloodGuard <span className="grad-text">AI</span>
  </span>
);

export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 bg-slate-800/60 text-slate-200 transition hover:border-sky-400 hover:text-sky-400"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
      )}
    </button>
  );
}

export const SeverityBadge = ({ severity }) => (
  <span className="rounded-full border px-3 py-1 text-xs font-bold uppercase" style={sevStyle(severity)}>
    {SEVERITY[severity]?.label || severity || "-"}
  </span>
);
