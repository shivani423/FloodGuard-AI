import { io } from "socket.io-client";

export const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const socket = io(API);

const getToken = () => { try { return localStorage.getItem("fg-token"); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem("fg-token", t) : localStorage.removeItem("fg-token"); } catch {} };
export const hasToken = () => !!getToken();

async function req(method, path, body) {
  const t = getToken();
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const e = new Error(data?.error || r.statusText);
    e.status = r.status;
    throw e;
  }
  return data;
}
export const get = (p) => req("GET", p);
export const post = (p, b) => req("POST", p, b ?? {});
export const put = (p, b) => req("PUT", p, b ?? {});
export const del = (p) => req("DELETE", p);
