import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { api, mockHotspots } from "./services/api";

const Auth = createContext();
const useAuth = () => useContext(Auth);
const colors = {
  Industrial: "#ff5964",
  Forest: "#45d483",
  Persistent: "#5a9cff",
  Agriculture: "#f7c85c",
};
const riskLabel = (r) =>
  r >= 0.9 ? "Very High" : r >= 0.7 ? "High" : r >= 0.4 ? "Medium" : "Low";
const riskClass = (r) => riskLabel(r).toLowerCase().replace(" ", "-");
const icon = (h) =>
  L.divIcon({
    className: "hotspot-icon",
    html: `<span style="--marker:${colors[h.category]}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(sessionStorage.getItem("thermowatch-user") || "null"),
  );
  const login = (user) => {
    sessionStorage.setItem("thermowatch-user", JSON.stringify(user));
    setUser(user);
  };
  const logout = () => {
    sessionStorage.removeItem("thermowatch-user");
    setUser(null);
  };
  return (
    <Auth.Provider value={{ user, login, logout }}>{children}</Auth.Provider>
  );
}
function Protected({ children }) {
  return useAuth().user ? children : <Navigate to="/login" replace />;
}

function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    code: "",
    org: "",
    captcha: "",
  });
  const [captcha, setCaptcha] = useState(() => makeCaptcha());
  const [error, setError] = useState("");
  if (user) return <Navigate to="/dashboard" replace />;
  const refreshCaptcha = () => {
    setCaptcha(makeCaptcha());
    setForm({ ...form, captcha: "" });
    setError("");
  };
  const submit = (e) => {
    e.preventDefault();
    if (Object.values(form).some((v) => !v.trim()))
      return setError("Please complete every required field.");
    if (form.captcha.trim().toUpperCase() !== captcha.answer)
      return setError("Captcha answer is incorrect. Please try again.");
    login({ name: form.name, org: form.org });
    nav("/dashboard");
  };
  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand large">
          ◉ THERMOWATCH <b>AI</b>
        </div>
        <p className="eyebrow">SATELLITE INTELLIGENCE PLATFORM</p>
        <h1>
          See the heat.
          <br />
          <em>Act with clarity.</em>
        </h1>
        <p>
          AI-powered detection and risk monitoring for industrial and
          environmental thermal events.
        </p>
        <div className="orbital" />
      </section>
      <form className="login-card" onSubmit={submit}>
        <div>
          <p className="eyebrow">SECURE ACCESS</p>
          <h2>Command center login</h2>
          <p className="muted">
            Use your organization credentials to continue.
          </p>
        </div>
        {[
          ["name", "Full name"],
          ["email", "Work email"],
          ["code", "Organization code"],
          ["org", "Password"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              required
              type={key === "org" ? "password" : key === "email" ? "email" : "text"}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        <label>
          Security check
          <div className="captcha-row">
            <div className="captcha-code" aria-label="Captcha code">
              {captcha.code}
            </div>
            <button
              type="button"
              className="captcha-refresh"
              onClick={refreshCaptcha}
              aria-label="Refresh captcha"
              title="Refresh captcha"
            >
              ↻
            </button>
            <input
              required
              aria-label="Enter captcha"
              placeholder="Enter code"
              value={form.captcha}
              onChange={(e) =>
                setForm({ ...form, captcha: e.target.value.toUpperCase() })
              }
            />
          </div>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary">
          Access dashboard <span>→</span>
        </button>
        <p className="signup">
          {/* Don't have an account? <a href="#new">Create a new.</a> */}
        </p>
      </form>
    </main>
  );
}
function makeCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from(
    { length: 5 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return { code, answer: code };
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const [light, setLight] = useState(
    () => localStorage.getItem("theme") === "light",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = light ? "light" : "dark";
    localStorage.setItem("theme", light ? "light" : "dark");
  }, [light]);
  return (
    <div className="app-shell">
      <header>
        <NavLink to="/dashboard" className="brand">
          ◉ THERMOWATCH <b>AI</b>
        </NavLink>
        <nav>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/top-hotspots">Top 20 Hotspots</NavLink>
          <NavLink to="/guidelines">Guidelines</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
        <div className="nav-actions">
          <span className="online">
            <i /> System Online
          </span>
          <button
            className="icon-button"
            onClick={() => setLight(!light)}
            aria-label="Toggle theme"
          >
            {light ? "☾" : "☀"}
          </button>
          <span className="avatar">{user.name[0]}</span>
          <button className="logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      {children}
      <Footer />
    </div>
  );
}
function Footer() {
  return (
    <footer>
      {/* <span>© 2026 ThermoWatch AI</span> */}
      <span>© 2026 ThermoWatch AI. All rights reserved.</span>
      <span>
        <a href="#privacy">Privacy</a> ·{" "}
        <a href="mailto:ops@thermowatch.ai">Contact</a>
      </span>
    </footer>
  );
}

function MapFocus({ selected }) {
  const map = useMap();
  useEffect(() => {
    if (selected)
      map.flyTo([selected.latitude, selected.longitude], 11, { duration: 1 });
  }, [selected, map]);
  return null;
}
function MapView({ hotspots, selected, onSelect }) {
  return (
    <div className="map-wrap">
      <MapContainer
        center={[22.2, 78.8]}
        zoom={4}
        scrollWheelZoom
        className="map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFocus selected={selected} />
        {hotspots.map((h) => (
          <Marker
            key={h.id}
            position={[h.latitude, h.longitude]}
            icon={icon(h)}
            eventHandlers={{ click: () => onSelect(h) }}
          >
            <Popup>
              <b>{h.name}</b>
              <br />
              {h.category} · {Math.round(h.risk * 100)}% risk
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="legend">
        {Object.entries(colors).map(([n, c]) => (
          <span key={n}>
            <i style={{ background: c }} />
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const loc = useLocation(),
    nav = useNavigate();
  const [hotspots, setHotspots] = useState([]),
    [loading, setLoading] = useState(true),
    [mode, setMode] = useState("Demo Mode"),
    [selected, setSelected] = useState(null),
    [query, setQuery] = useState(""),
    [filters, setFilters] = useState({
      category: "All",
      risk: "All",
      time: "30",
    });
  useEffect(() => {
    api
      .hotspots()
      .then(({ data, mode }) => {
        setHotspots(data);
        setMode(mode);
        const target = new URLSearchParams(loc.search).get("hotspot");
        if (target) setSelected(data.find((x) => x.id === target) || null);
      })
      .finally(() => setLoading(false));
  }, [loc.search]);
  const filtered = useMemo(
    () =>
      hotspots.filter(
        (h) =>
          (filters.category === "All" || h.category === filters.category) &&
          (filters.risk === "All" || riskLabel(h.risk) === filters.risk) &&
          (filters.time === "30" || h.daysAgo <= Number(filters.time)) &&
          (!query ||
            `${h.name} ${h.id} ${h.category} ${h.latitude} ${h.longitude}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [hotspots, filters, query],
  );
  const stats = {
    total: filtered.length,
    Industrial: filtered.filter((x) => x.category === "Industrial").length,
    Forest: filtered.filter((x) => x.category === "Forest").length,
    Persistent: filtered.filter((x) => x.category === "Persistent").length,
    Agriculture: filtered.filter((x) => x.category === "Agriculture").length,
    high: filtered.filter((x) => x.risk >= 0.7).length,
  };
  const choose = (h) => setSelected(h);
  const categories = Object.keys(colors).map((name) => ({
    name,
    value: stats[name],
    color: colors[name],
  }));
  const riskData = ["Low", "Medium", "High", "Very High"].map((name) => ({
    name,
    value: filtered.filter((h) => riskLabel(h.risk) === name).length,
  }));
  return (
    <Layout>
      <main className="dashboard">
        <section className="hero">
          <div>
            <p className="eyebrow">LIVE GEOINTELLIGENCE</p>
            <h1>AI Thermal Hotspot Monitoring</h1>
            <p>
              Satellite-powered detection, classification and risk monitoring of
              thermal hotspots.
            </p>
          </div>
          {/* <div className="source">
            ◈ Data Source: NASA FIRMS + Geospatial Intelligence + AI/ML
          </div> */}
        </section>
        <div className="status-row">
          <span className="mode">
            {mode === "Demo Mode" ? "◈ Demo Mode" : "● Backend Connected"}
          </span>
          <span>Updated moments ago · {filtered.length} records in view</span>
        </div>
        <section className="kpis">
          {[
            ["Total Hotspots", stats.total, "◉"],
            ["Industrial Fires", stats.Industrial, "△"],
            ["Forest Fires", stats.Forest, "♧"],
            ["Persistent Sources", stats.Persistent, "◌"],
            ["Agriculture Burning", stats.Agriculture, "⌁"],
            ["High Risk Hotspots", stats.high, "!"],
          ].map(([n, v, i]) => (
            <article className="kpi" key={n}>
              <span>{i}</span>
              <div>
                <small>{n}</small>
                <strong>{v}</strong>
              </div>
            </article>
          ))}
        </section>
        <section className="map-section panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">SPATIAL VIEW</p>
              <h2>Live thermal event map</h2>
            </div>
            <div className="search">
              <span>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hotspot, ID, category or coordinates"
              />
            </div>
          </div>
          <div className="filters">
            {[
              ["category", "Category", ["All", ...Object.keys(colors)]],
              ["risk", "Risk", ["All", "Low", "Medium", "High", "Very High"]],
              ["time", "Time", ["30", "7", "1"]],
            ].map(([key, label, options]) => (
              <label key={key}>
                {label}
                <select
                  value={filters[key]}
                  onChange={(e) =>
                    setFilters({ ...filters, [key]: e.target.value })
                  }
                >
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {key === "time"
                        ? o === "30"
                          ? "Last 30 Days"
                          : o === "7"
                            ? "Last 7 Days"
                            : "Today"
                        : o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <button
              className="clear"
              onClick={() => {
                setFilters({ category: "All", risk: "All", time: "30" });
                setQuery("");
              }}
            >
              Reset filters
            </button>
          </div>
          {loading ? (
            <div className="loading">Loading satellite hotspot data...</div>
          ) : (
            <div className="map-grid">
              <MapView
                hotspots={filtered}
                selected={selected}
                onSelect={choose}
              />
              <Details hotspot={selected} />
            </div>
          )}
        </section>
        <section className="analytics">
          <ChartCard title="Hotspots by Category">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={4}
                >
                  {categories.map((x) => (
                    <Cell key={x.name} fill={x.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-labels">
              {categories.map((x) => (
                <span key={x.name}>
                  <i style={{ background: x.color }} />
                  {x.name} {x.value}
                </span>
              ))}
            </div>
          </ChartCard>
          <ChartCard title="Risk Distribution">
            <ResponsiveContainer>
              <AreaChart data={riskData}>
                <defs>
                  <linearGradient id="risk" x1="0" x2="0" y1="0" y2="1">
                    <stop stopColor="#8e76ff" stopOpacity=".7" />
                    <stop offset="1" stopColor="#8e76ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "currentColor", fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#9c83ff"
                  fill="url(#risk)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Hotspot Activity">
            <ResponsiveContainer>
              <AreaChart
                data={[1, 2, 3, 4, 5, 6, 7].map((d, i) => ({
                  day: `D${d}`,
                  events: Math.max(2, stats.total - (6 - i) * 2),
                }))}
              >
                <XAxis
                  dataKey="day"
                  tick={{ fill: "currentColor", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "currentColor", fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="step"
                  dataKey="events"
                  stroke="#42d5b0"
                  fill="#42d5b044"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>
        <section className="bottom-grid">
          <div className="panel pipeline">
            <p className="eyebrow">DATA FLOW</p>
            <h2>Detection intelligence pipeline</h2>
            <div>
              {[
                "NASA FIRMS",
                "Geospatial Context",
                "AI Classification",
                "Risk Assessment",
                "Command Center",
              ].map((n, i) => (
                <React.Fragment key={n}>
                  <span>{n}</span>
                  {i < 4 && <b>→</b>}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="panel high-risk">
            <p className="eyebrow">PRIORITY ALERTS</p>
            <h2>Very high risk detections</h2>
            {filtered
              .filter((h) => h.risk >= 0.9)
              .slice(0, 3)
              .map((h) => (
                <article key={h.id}>
                  <div>
                    <b>{h.name}</b>
                    <small>
                      {h.id} · FRP {h.frp} MW
                    </small>
                  </div>
                  <span className="risk very-high">
                    {Math.round(h.risk * 100)}%
                  </span>
                  <button onClick={() => choose(h)}>View on Map</button>
                </article>
              ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
function Details({ hotspot: h }) {
  if (!h)
    return (
      <aside className="details empty">
        <span>◎</span>
        <h3>Select a hotspot</h3>
        <p>
          Click a marker, search result, or priority alert to inspect its
          geospatial intelligence.
        </p>
      </aside>
    );
  return (
    <aside className="details">
      <p className="eyebrow">HOTSPOT DETAILS</p>
      <h3>{h.name}</h3>
      <div className="badges">
        <span className="category" style={{ borderColor: colors[h.category] }}>
          {h.category}
        </span>
        <span className={"risk " + riskClass(h.risk)}>
          {riskLabel(h.risk)} · {Math.round(h.risk * 100)}%
        </span>
      </div>
      <dl>
        <dt>Location ID</dt>
        <dd>{h.id}</dd>
        <dt>Coordinates</dt>
        <dd>
          {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
        </dd>
        <dt>Detection time</dt>
        <dd>{h.detectionTime}</dd>
        <dt>FRP</dt>
        <dd>{h.frp} MW</dd>
        <dt>Previous active days</dt>
        <dd>{h.activeDays} days</dd>
        <dt>Nearest feature</dt>
        <dd>{h.context}</dd>
        <dt>Distance</dt>
        <dd>{h.distance} km</dd>
      </dl>
    </aside>
  );
}
function ChartCard({ title, children }) {
  return (
    <article className="panel chart">
      <h3>{title}</h3>
      <div className="chart-canvas">{children}</div>
    </article>
  );
}

function TopHotspots() {
  const [search, setSearch] = useState(""),
    [sort, setSort] = useState("risk"),
    [updated, setUpdated] = useState(new Date()),
    [auto, setAuto] = useState(true);
  const nav = useNavigate();
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setUpdated(new Date()), 30000);
    return () => clearInterval(id);
  }, [auto]);
  const rows = useMemo(
    () =>
      mockHotspots
        .filter(
          (h) =>
            h.category === "Industrial" &&
            `${h.name} ${h.id}`.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name)
            : sort === "frp"
              ? b.frp - a.frp
              : b.risk - a.risk,
        )
        .slice(0, 20),
    [search, sort],
  );
  return (
    <Layout>
      <main className="content-page">
        <section className="page-head">
          <div>
            <p className="eyebrow">INDUSTRIAL RISK INTELLIGENCE</p>
            <h1>Top 20 Thermal Hotspots</h1>
            <p>Ranked by maximum predicted risk and thermal intensity.</p>
          </div>
          <div className="refresh">
            <span className="online">
              <i /> Auto Refresh: {auto ? "ON" : "OFF"}
            </span>
            <button onClick={() => setAuto(!auto)}>
              {auto ? "Pause" : "Resume"}
            </button>
            <small>
              Last Updated:{" "}
              {Math.max(0, Math.floor((Date.now() - updated) / 60000))} minutes
              ago
            </small>
          </div>
        </section>
        <section className="panel table-panel">
          <div className="table-tools">
            <div className="search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search location ID or hotspot"
              />
            </div>
            <label>
              Sort by{" "}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="risk">Max Risk</option>
                <option value="frp">Max FRP</option>
                <option value="name">Location</option>
              </select>
            </label>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Rank",
                    "Location ID",
                    "Latitude",
                    "Longitude",
                    "Detection Count",
                    "Max Risk",
                    "Avg Risk",
                    "Max FRP",
                    "Active Days",
                    "Min Distance",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((h, i) => (
                  <tr
                    key={h.id}
                    onClick={() => nav(`/dashboard?hotspot=${h.id}`)}
                  >
                    <td>
                      <b className="rank">{i + 1}</b>
                    </td>
                    <td>
                      <b>{h.name}</b>
                      <small>{h.id}</small>
                    </td>
                    <td>{h.latitude.toFixed(4)}</td>
                    <td>{h.longitude.toFixed(4)}</td>
                    <td>{h.count}</td>
                    <td>
                      <span className={"risk " + riskClass(h.risk)}>
                        {Math.round(h.risk * 100)}%
                      </span>
                    </td>
                    <td>{Math.round((h.risk - 0.08) * 100)}%</td>
                    <td className="frp">{h.frp} MW</td>
                    <td>{h.activeDays}</td>
                    <td>{h.distance} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </Layout>
  );
}
function InfoPage({ type }) {
  const guide = type === "guidelines";
  return (
    <Layout>
      <main className="content-page info">
        <p className="eyebrow">THERMOWATCH AI</p>
        <h1>{guide ? "Guidelines" : "About the project"}</h1>
        {guide ? (
          <>
            <p className="lead">
              Use the live map to locate, understand, and prioritize thermal
              events quickly.
            </p>
            <div className="info-grid">
              <article className="panel">
                <h2>Map symbols</h2>
                <p>
                  <b className="red">●</b> Industrial fire &nbsp;{" "}
                  <b className="green">●</b> Forest fire
                  <br />
                  <b className="blue">●</b> Persistent thermal source &nbsp;{" "}
                  <b className="yellow">●</b> Agriculture burning
                </p>
              </article>
              <article className="panel">
                <h2>Risk & metrics</h2>
                <p>
                  <b>FRP</b> (Fire Radiative Power) estimates thermal energy
                  release. <b>Risk score</b> is displayed as a percentage for
                  prioritization. <b>Previous active days</b> indicates
                  recurrence detected in the recent observation window.
                </p>
              </article>
              <article className="panel">
                <h2>How to investigate</h2>
                <p>
                  Filter by category, risk, and time. Search by name,
                  identifier, category, or coordinates. Selecting a result opens
                  its detailed geospatial context and centers the map.
                </p>
              </article>
            </div>
          </>
        ) : (
          <>
            <p className="lead">
              ThermoWatch AI is a situational-awareness interface for teams
              monitoring industrial and environmental thermal events.
            </p>
            <div className="info-grid">
              <article className="panel">
                <h2>Purpose</h2>
                <p>
                  Bring satellite detections, geospatial context, and AI/ML
                  classifications into one clear operational view for faster
                  triage.
                </p>
              </article>
              <article className="panel">
                <h2>Integrated intelligence</h2>
                <p>
                  NASA FIRMS supplies remote-sensing detections; OpenStreetMap
                  context adds nearby infrastructure; backend AI/ML services
                  provide classifications and risk scores.
                </p>
              </article>
              <article className="panel">
                <h2>Frontend boundary</h2>
                <p>
                  This application visualizes backend data, maps it
                  interactively, and supports exploration. It does not calculate
                  predictions or alter source records.
                </p>
              </article>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/top-hotspots"
          element={
            <Protected>
              <TopHotspots />
            </Protected>
          }
        />
        <Route
          path="/guidelines"
          element={
            <Protected>
              <InfoPage type="guidelines" />
            </Protected>
          }
        />
        <Route
          path="/about"
          element={
            <Protected>
              <InfoPage type="about" />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
