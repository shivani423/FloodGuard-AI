import { useEffect, useState } from "react";
import { get } from "../api";
import { Card, SeverityBadge } from "../components/ui.jsx";

export default function Alerts() {
  const [rows, setRows] = useState([]);
  useEffect(() => { get("/api/alerts").then(setRows).catch(() => {}); }, []);
  return (
    <Card title="Alert History">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr><th className="py-2">Time</th><th>Zone</th><th>Severity</th><th>Type</th><th>Message</th><th>Emails</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a._id} className="border-t border-slate-800 align-top">
                <td className="py-2 pr-3 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</td>
                <td className="pr-3">{a.zoneName || "-"}</td>
                <td className="pr-3"><SeverityBadge severity={a.severity} /></td>
                <td className="pr-3">{a.type || "auto"}</td>
                <td className="pr-3">{a.message}</td>
                <td>{a.emailsSent || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-4 text-slate-400">No alerts yet.</p>}
      </div>
    </Card>
  );
}
