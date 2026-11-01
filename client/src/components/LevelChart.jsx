import { useTheme } from "../theme.js";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

export default function LevelChart({ data, settings, height = 300 }) {
  const [theme] = useTheme();
  const c = theme === "dark"
    ? { grid: "#1e293b", axis: "#64748b", tip: "#0f172a", border: "#334155", text: "#e2e8f0" }
    : { grid: "#e2e8f0", axis: "#64748b", tip: "#ffffff", border: "#cbd5e1", text: "#0f172a" };
  const rows = data.map((r) => ({ time: new Date(r.createdAt).toLocaleTimeString(), level: r.waterLevelCm }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows}>
        <CartesianGrid stroke={c.grid} />
        <XAxis dataKey="time" stroke={c.axis} tick={{ fontSize: 11 }} minTickGap={40} />
        <YAxis stroke={c.axis} unit=" cm" domain={[0, settings?.tankHeightCm || 30]} />
        <Tooltip contentStyle={{ background: c.tip, border: `1px solid ${c.border}`, color: c.text }} />
        {settings && <ReferenceLine y={settings.warningLevelCm} stroke="#facc15" strokeDasharray="4 4" />}
        {settings && <ReferenceLine y={settings.criticalLevelCm} stroke="#f87171" strokeDasharray="4 4" />}
        <Line type="monotone" dataKey="level" stroke="#38bdf8" dot={false} strokeWidth={2} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
