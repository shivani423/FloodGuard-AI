import { useEffect, useState } from "react";
import { del, get, hasToken, post, put, setToken } from "../api";
import { Card, Logo, SeverityBadge } from "../components/ui.jsx";

const input = "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm";
const btn = "rounded-lg px-3 py-2 text-sm font-medium";
const T = (key, label, type) => ({ key, label, type });

/* ---------------- Login + Signup ---------------- */
function AuthScreen({ onDone }) {
  const [mode, setMode] = useState("login");
  const [st, setSt] = useState({ signupEnabled: true, codeRequired: true });
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", code: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { get("/api/admin/auth/status").then(setSt).catch(() => {}); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (mode === "signup") {
      if (f.password.length < 8) return setErr("Password must be at least 8 characters");
      if (f.password !== f.confirm) return setErr("Passwords do not match");
    }
    setBusy(true);
    try {
      const r = mode === "login"
        ? await post("/api/admin/auth/login", { email: f.email, password: f.password })
        : await post("/api/admin/auth/signup", { name: f.name, email: f.email, password: f.password, code: f.code });
      setToken(r.token);
      onDone();
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-md space-y-4 pt-6">
      <div className="flex justify-center"><Logo /></div>
      <Card>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {[["login", "Login"], ["signup", "Sign up"]].map(([k, l]) => (
            <button key={k} onClick={() => { setMode(k); setErr(""); }} className={`${btn} ${mode === k ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300"}`}>{l}</button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (st.signupEnabled ? (
            <input className={input} placeholder="Full name" value={f.name} onChange={set("name")} />
          ) : (
            <p className="rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-400">Signup is disabled. Add ADMIN_SIGNUP_CODE to server/.env and restart the server.</p>
          ))}
          <input className={input} type="email" required placeholder="Email" value={f.email} onChange={set("email")} />
          <input className={input} type="password" required placeholder={mode === "signup" ? "Password (min 8 characters)" : "Password"} value={f.password} onChange={set("password")} />
          {mode === "signup" && st.signupEnabled && (
            <>
              <input className={input} type="password" required placeholder="Confirm password" value={f.confirm} onChange={set("confirm")} />
              {st.codeRequired && <input className={input} required placeholder="Admin signup code" value={f.code} onChange={set("code")} />}
            </>
          )}
          <button disabled={busy || (mode === "signup" && !st.signupEnabled)} className={`${btn} w-full bg-sky-500 text-white disabled:opacity-50`}>
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Create admin account"}
          </button>
          {err && <p className="text-sm text-red-400">{err}</p>}
        </form>
        <p className="mt-4 text-xs text-slate-500">
          {mode === "signup"
            ? "The signup code is the ADMIN_SIGNUP_CODE value in server/.env. It stops strangers from becoming admins."
            : "No account yet? Use the Sign up tab."}
        </p>
      </Card>
    </div>
  );
}

/* ---------------- Generic table with add/edit/delete ---------------- */
function Crud({ path, fields, columns, readOnly, clearAll }) {
  const cols = columns || fields;
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState("");
  const load = () => get(`/api/admin/${path}`).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [path]);

  const save = async () => {
    try {
      const body = {};
      fields.forEach((f) => {
        let v = form[f.key];
        if (f.type === "number") v = v === "" || v === undefined ? undefined : Number(v);
        if (f.type === "checkbox") v = !!v;
        body[f.key] = v;
      });
      editId ? await put(`/api/admin/${path}/${editId}`, body) : await post(`/api/admin/${path}`, body);
      setForm({}); setEditId(null); setErr(""); load();
    } catch (e) { setErr(e.message); }
  };
  const remove = async (id) => {
    if (!confirm("Delete this item?")) return;
    try { await del(`/api/admin/${path}/${id}`); setErr(""); load(); } catch (e) { setErr(e.message); }
  };
  const clear = async () => {
    if (!confirm("Delete ALL items in this list?")) return;
    try { await del(`/api/admin/${path}`); load(); } catch (e) { setErr(e.message); }
  };
  const cell = (r, k) => {
    const v = r[k];
    if (k === "createdAt" && v) return new Date(v).toLocaleString();
    if (k === "severity") return <SeverityBadge severity={v} />;
    return String(v ?? "");
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Card title={editId ? "Edit item" : "Add new"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) => (
              <label key={f.key} className="text-xs text-slate-400">{f.label}
                {f.type === "checkbox"
                  ? <input type="checkbox" className="ml-2" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
                  : <input className={`${input} mt-1`} type={f.type || "text"} step="any" value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={save} className={`${btn} bg-sky-500 text-white`}>{editId ? "Update" : "Add"}</button>
            {editId && <button onClick={() => { setEditId(null); setForm({}); }} className={`${btn} bg-slate-800`}>Cancel</button>}
          </div>
        </Card>
      )}
      {err && <p className="text-sm text-red-400">{err}</p>}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-slate-400">{rows.length} items</span>
          {clearAll && rows.length > 0 && <button onClick={clear} className={`${btn} bg-red-500/15 text-red-400`}>Clear all</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400"><tr>{cols.map((c) => <th key={c.key} className="py-2 pr-3">{c.label}</th>)}<th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-t border-slate-800 align-top">
                  {cols.map((c) => <td key={c.key} className="py-2 pr-3">{cell(r, c.key)}</td>)}
                  <td className="whitespace-nowrap text-right">
                    {!readOnly && <button onClick={() => { setEditId(r._id); setForm(r); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mr-3 text-sky-400">Edit</button>}
                    <button onClick={() => remove(r._id)} className="text-red-400">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="py-3 text-slate-400">Nothing here yet.</p>}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Overview: zones, rain simulation, broadcast ---------------- */
const PRESETS = {
  "Heavy rain": { rainNowMm: 9, next6hMm: 40, next24hMm: 80 },
  "Very heavy rain": { rainNowMm: 18, next6hMm: 70, next24hMm: 130 },
};

function Overview({ zones }) {
  const [zoneId, setZoneId] = useState("all");
  const [bc, setBc] = useState({ severity: "high", message: "" });
  const [msg, setMsg] = useState("");
  const [alerts, setAlerts] = useState([]);
  useEffect(() => { get("/api/alerts").then((a) => setAlerts(a.slice(0, 6))).catch(() => {}); }, [msg]);

  const run = async (fn, ok) => {
    try { const r = await fn(); setMsg(typeof ok === "function" ? ok(r) : ok); }
    catch (e) { setMsg(e.message); }
  };
  const zoneSelect = (
    <select className={`${input} mb-3`} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
      <option value="all">All zones</option>
      {zones.map((z) => <option key={z.zoneId} value={z.zoneId}>{z.name}</option>)}
    </select>
  );

  return (
    <div className="space-y-4">
      <Card title="Zones right now">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="text-slate-400"><tr><th className="py-2">Zone</th><th>Severity</th><th>Score</th><th>Why</th><th>Rain 24h</th></tr></thead>
          <tbody>{zones.map((z) => (
            <tr key={z.zoneId} className="border-t border-slate-800 align-top">
              <td className="py-2 pr-3">{z.name}</td>
              <td className="pr-3"><SeverityBadge severity={z.severity} /></td>
              <td className="pr-3">{z.score}</td>
              <td className="pr-3 text-slate-400">{z.reasons.join("; ")}</td>
              <td>{z.weather ? `${z.weather.next24hMm} mm${z.weather.override ? " (sim)" : ""}` : "n/a"}</td>
            </tr>))}</tbody>
        </table></div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Simulate rainfall (demo)">
          {zoneSelect}
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([k, v]) => (
              <button key={k} className={`${btn} bg-sky-500 text-white`} onClick={() => run(() => post("/api/admin/weather/override", { zoneId, ...v, minutes: 60 }), `${k} simulated for 60 minutes`)}>{k}</button>
            ))}
            <button className={`${btn} bg-slate-800`} onClick={() => run(() => del(`/api/admin/weather/override?zoneId=${zoneId}`), "Back to live weather")}>Use live weather</button>
          </div>
          <p className="mt-2 text-xs text-slate-500">For demos when it is not actually raining. Severity updates immediately.</p>
        </Card>

        <Card title="Broadcast alert to subscribers">
          {zoneSelect}
          <select className={`${input} mb-2`} value={bc.severity} onChange={(e) => setBc({ ...bc, severity: e.target.value })}>
            {["low", "moderate", "high", "severe"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <textarea className={`${input} mb-2`} rows={3} placeholder="Message to subscribers" value={bc.message} onChange={(e) => setBc({ ...bc, message: e.target.value })} />
          <button className={`${btn} bg-orange-500 text-white`} onClick={() => run(() => post("/api/admin/broadcast", { zoneId, ...bc }), (r) => `Broadcast saved. Emails sent: ${r.emailsSent} of ${r.recipients} subscribers`)}>Send broadcast</button>
        </Card>
      </div>
      {msg && <p className="text-sm text-emerald-400">{msg}</p>}

      <Card title="Latest alerts">
        {alerts.map((a) => <div key={a._id} className="flex items-center gap-2 py-1 text-sm"><SeverityBadge severity={a.severity} /><span>{a.message}</span></div>)}
        {!alerts.length && <p className="text-slate-400">No alerts yet.</p>}
      </Card>
    </div>
  );
}

/* ---------------- Settings ---------------- */
const SET_FIELDS = [["tankHeightCm", "Tank height (cm)"], ["sensorOffsetCm", "Sensor offset (cm)"], ["warningLevelCm", "Warning level (cm)"], ["criticalLevelCm", "Critical level (cm)"], ["emailCooldownMin", "Email cooldown (min)"]];
function SettingsPanel() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { get("/api/admin/settings").then((d) => setS({ ...d, alertEmails: d.alertEmails.join(", ") })); }, []);
  if (!s) return <p>Loading...</p>;
  const save = async () => {
    const body = { ...s, alertEmails: s.alertEmails.split(",").map((e) => e.trim()).filter(Boolean) };
    SET_FIELDS.forEach(([k]) => (body[k] = Number(body[k])));
    await put("/api/admin/settings", body);
    setMsg("Saved"); setTimeout(() => setMsg(""), 2000);
  };
  return (
    <Card title="Sensor and alert settings" className="max-w-xl">
      <div className="space-y-3">
        {SET_FIELDS.map(([k, l]) => (
          <label key={k} className="block text-sm"><span className="text-slate-400">{l}</span>
            <input type="number" className={input} value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></label>
        ))}
        <label className="block text-sm"><span className="text-slate-400">Admin alert emails (comma separated, get every auto alert)</span>
          <input className={input} value={s.alertEmails} onChange={(e) => setS({ ...s, alertEmails: e.target.value })} /></label>
        <button onClick={save} className={`${btn} bg-sky-500 text-white`}>Save</button>
        {msg && <span className="ml-3 text-emerald-400">{msg}</span>}
      </div>
    </Card>
  );
}

/* ---------------- Admin accounts ---------------- */
function AdminsPanel() {
  const [f, setF] = useState({ currentPassword: "", newPassword: "" });
  const [msg, setMsg] = useState(null);
  const change = async () => {
    try { await post("/api/admin/auth/change-password", f); setMsg({ ok: true, text: "Password changed" }); setF({ currentPassword: "", newPassword: "" }); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
  };
  return (
    <div className="space-y-4">
      <Card title="Change my password" className="max-w-xl">
        <div className="space-y-3">
          <input className={input} type="password" placeholder="Current password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} />
          <input className={input} type="password" placeholder="New password (min 8 characters)" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
          <button onClick={change} className={`${btn} bg-sky-500 text-white`}>Change password</button>
          {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
        </div>
      </Card>
      <Crud path="users" fields={[]} readOnly columns={[T("name", "Name"), T("email", "Email"), T("createdAt", "Created")]} />
      <p className="text-xs text-slate-500">New admins can create their own account from the Sign up tab on this page using the ADMIN_SIGNUP_CODE.</p>
    </div>
  );
}

/* ---------------- System check ---------------- */
function SystemPanel() {
  const [checks, setChecks] = useState(null);
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState(null);
  const load = () => { setChecks(null); get("/api/admin/system").then((d) => setChecks(d.checks)).catch((e) => setMsg({ ok: false, text: e.message })); };
  useEffect(load, []);
  const act = async (fn, okText) => { try { await fn(); setMsg({ ok: true, text: okText }); load(); } catch (e) { setMsg({ ok: false, text: e.message }); } };

  return (
    <div className="space-y-4">
      <Card title="System check">
        {!checks ? <p className="text-slate-400">Checking...</p> : (
          <table className="w-full text-left text-sm"><tbody>
            {checks.map((c) => (
              <tr key={c.name} className="border-t border-slate-800 first:border-0">
                <td className="py-2 pr-3 font-medium">{c.name}</td>
                <td className="pr-3">{c.ok ? "✅" : "❌"}</td>
                <td className="text-slate-400">{c.detail}</td>
              </tr>
            ))}
          </tbody></table>
        )}
        <button onClick={load} className={`${btn} mt-3 bg-slate-800`}>Re-check</button>
      </Card>

      <Card title="Send a test email" className="max-w-xl">
        <div className="flex gap-2">
          <input className={input} type="email" placeholder="your@email.com" value={to} onChange={(e) => setTo(e.target.value)} />
          <button onClick={() => act(() => post("/api/admin/test-email", { to }), "Test email sent. Check your inbox (and spam).")} className={`${btn} bg-sky-500 text-white`}>Send</button>
        </div>
      </Card>

      <Card title="Reset demo data" className="max-w-xl">
        <p className="mb-3 text-sm text-slate-400">Clears stored sensor readings or alerts. Zones, nodes, shelters and subscribers stay.</p>
        <div className="flex gap-2">
          <button onClick={() => confirm("Delete all readings?") && act(() => del("/api/admin/readings"), "Readings cleared")} className={`${btn} bg-red-500/15 text-red-400`}>Clear readings</button>
          <button onClick={() => confirm("Delete all alerts?") && act(() => del("/api/admin/alerts"), "Alerts cleared")} className={`${btn} bg-red-500/15 text-red-400`}>Clear alerts</button>
        </div>
      </Card>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}

/* ---------------- Main ---------------- */
const TABS = {
  Overview: { kind: "overview" },
  Nodes: { kind: "crud", path: "nodes", fields: [T("nodeId", "Node ID"), T("name", "Name"), T("zoneId", "Zone ID"), T("lat", "Lat", "number"), T("lng", "Lng", "number"), T("simulated", "Simulated", "checkbox")] },
  Zones: { kind: "crud", path: "zones", fields: [T("zoneId", "Zone ID"), T("name", "Name"), T("lat", "Lat", "number"), T("lng", "Lng", "number"), T("radiusM", "Radius (m)", "number"), T("population", "Population", "number"), T("vulnerability", "Vulnerability 1-3", "number")] },
  Shelters: { kind: "crud", path: "shelters", fields: [T("name", "Name"), T("lat", "Lat", "number"), T("lng", "Lng", "number"), T("capacity", "Capacity", "number"), T("contact", "Contact"), T("zoneId", "Zone ID")] },
  Subscribers: { kind: "crud", path: "subscribers", fields: [], readOnly: true, columns: [T("email", "Email"), T("name", "Name"), T("zoneId", "Zone"), T("createdAt", "Joined")] },
  Alerts: { kind: "crud", path: "alerts", fields: [], readOnly: true, clearAll: true, columns: [T("createdAt", "Time"), T("zoneName", "Zone"), T("severity", "Severity"), T("type", "Type"), T("message", "Message"), T("emailsSent", "Emails")] },
  Admins: { kind: "admins" },
  Settings: { kind: "settings" },
  System: { kind: "system" },
};

export default function Admin() {
  const [authed, setAuthed] = useState(hasToken());
  const [tab, setTab] = useState("Overview");
  const [zones, setZones] = useState([]);
  const [me, setMe] = useState("");

  useEffect(() => {
    if (!authed) return;
    get("/api/admin/auth/me").then((d) => setMe(d.email)).catch((e) => { if (e.status === 401) { setToken(null); setAuthed(false); } });
    const load = () => get("/api/overview").then((d) => setZones(d.zones)).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [authed]);

  if (!authed) return <AuthScreen onDone={() => setAuthed(true)} />;
  const cfg = TABS[tab];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-3 text-xl font-bold">Admin</h2>
        {Object.keys(TABS).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`${btn} ${tab === t ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300"}`}>{t}</button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-400">
          {me}
          <button onClick={() => { setToken(null); setAuthed(false); }} className={`${btn} bg-slate-800 text-slate-200`}>Logout</button>
        </div>
      </div>
      {cfg.kind === "overview" && <Overview zones={zones} />}
      {cfg.kind === "crud" && <Crud key={cfg.path} {...cfg} />}
      {cfg.kind === "admins" && <AdminsPanel />}
      {cfg.kind === "settings" && <SettingsPanel />}
      {cfg.kind === "system" && <SystemPanel />}
    </div>
  );
}
