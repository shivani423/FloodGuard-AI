import { useEffect, useState } from "react";

const KEY = "floodguard-theme";

function initial() {
  try { const s = localStorage.getItem(KEY); if (s === "light" || s === "dark") return s; } catch {}
  return "dark";
}

let current = initial();
const subs = new Set();

function apply(t) {
  document.documentElement.dataset.theme = t;
  document.documentElement.style.colorScheme = t;
}
apply(current);

export function setTheme(t) {
  current = t;
  apply(t);
  try { localStorage.setItem(KEY, t); } catch {}
  subs.forEach((f) => f(t));
}

export function useTheme() {
  const [t, setT] = useState(current);
  useEffect(() => { subs.add(setT); return () => subs.delete(setT); }, []);
  return [t, () => setTheme(t === "dark" ? "light" : "dark")];
}
