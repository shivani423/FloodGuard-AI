import { NavLink, Route, Routes, Link, useLocation } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MapPage from "./pages/MapPage.jsx";
import Subscribe from "./pages/Subscribe.jsx";
import Evacuation from "./pages/Evacuation.jsx";
import History from "./pages/History.jsx";
import Alerts from "./pages/Alerts.jsx";
import Admin from "./pages/Admin.jsx";
import About from "./pages/About.jsx";
import { Logo, ThemeToggle } from "./components/ui.jsx";

const links = [
  ["/dashboard", "Dashboard"], ["/map", "Risk Map"], ["/alerts", "Alerts"], ["/subscribe", "Get Warnings"],
  ["/evacuation", "Evacuation"], ["/history", "History"], ["/about", "About"],
];

function AppLayout() {
  return (
    <div className="hero-bg min-h-screen">
      <header className="sticky top-0 z-[1000] border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/"><Logo /></Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "font-semibold text-sky-400" : "text-slate-400 hover:text-sky-400")}>{label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <NavLink to="/admin" className={({ isActive }) => `text-sm ${isActive ? "font-semibold text-sky-400" : "text-slate-400 hover:text-sky-400"}`}>Admin</NavLink>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/evacuation" element={<Evacuation />} />
          <Route path="/history" element={<History />} />
          <Route path="/about" element={<About />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  return pathname === "/" ? <Landing /> : <AppLayout />;
}
