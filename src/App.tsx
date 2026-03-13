import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  usePulsePoint, Incident,
  TYPE_LABELS, TYPE_SHORT, STATUS_LABELS, STATUS_COLORS,
  BUREAU_NAMES, CATEGORY_COLORS, CATEGORY_LABELS,
  getCategory, getMostActiveStatus, getUnitType,
  formatTime, formatAddress, elapsedMinutes,
  IncidentCategory,
} from "./hooks";

/* ═══════════════════════════════════════════════════════════════════
   POLYMARKET SPARK CHART — smooth gradient fill with hover dots
   ═══════════════════════════════════════════════════════════════════ */
function SparkChart({ data, color = "#2D7FF9", w = 120, h = 40, label, value }: {
  data: number[]; color?: string; w?: number; h?: number; label?: string; value?: string;
}) {
  if (data.length < 2) return <div style={{ width: w, height: h }} className="flex items-center justify-center"><span className="text-[10px] mono text-gray-600">collecting...</span></div>;
  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.1 || 1;
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - 4 - ((v - min) / range) * (h - 8),
  }));
  // Smooth curve
  const path = pts.map((p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  }).join(" ");
  const areaPath = `${path} L ${w},${h} L 0,${h} Z`;
  const gradId = `sg${color.replace("#", "")}${w}`;
  const last = pts[pts.length - 1];
  const prev = data[data.length - 2];
  const curr = data[data.length - 1];
  const trend = curr > prev ? "▲" : curr < prev ? "▼" : "━";
  const tc = curr > prev ? "#FF3B5C" : curr < prev ? "#00E08E" : "#4A5568";

  return (
    <div className="flex flex-col gap-1">
      {(label || value) && (
        <div className="flex items-baseline justify-between">
          {label && <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">{label}</span>}
          <div className="flex items-baseline gap-1.5">
            {value && <span className="mono text-xl font-bold" style={{ color }}>{value}</span>}
            <span className="mono text-[10px] font-bold" style={{ color: tc }}>{trend}</span>
          </div>
        </div>
      )}
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx={last.x} cy={last.y} r="3" fill={color} className="chart-dot">
          <animate attributeName="r" values="3;4;3" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MINI PROGRESS BAR
   ═══════════════════════════════════════════════════════════════════ */
function Bar({ value, max, color, h = 6 }: { value: number; max: number; color: string; h?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: h, background: "rgba(30,45,74,0.5)" }}>
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}CC)` }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AI INTELLIGENCE ENGINE
   ═══════════════════════════════════════════════════════════════════ */
function useIntel(incidents: Incident[]) {
  return useMemo(() => {
    const alerts: { text: string; severity: "high" | "med" | "low" }[] = [];
    if (!incidents.length) return alerts;

    // Structure fire detection
    const structs = incidents.filter(i => ["SF", "RF", "CF", "WSF", "WRF", "WCF", "FULL"].includes(i.type));
    structs.forEach(s => {
      alerts.push({ text: `STRUCTURE FIRE — ${formatAddress(s.addr)} — ${s.units.length} units`, severity: "high" });
    });

    // Multi-unit surge
    const heavy = incidents.filter(i => i.units.length >= 8 && !structs.includes(i));
    heavy.forEach(h => {
      alerts.push({ text: `HEAVY RESPONSE — ${formatAddress(h.addr)} — ${h.units.length} units assigned`, severity: "high" });
    });

    // Bureau imbalance
    const bc: Record<string, number> = {};
    incidents.forEach(i => { bc[i.agency] = (bc[i.agency] || 0) + 1; });
    const vals = Object.values(bc);
    if (vals.length > 1) {
      const avg = incidents.length / vals.length;
      Object.entries(bc).forEach(([b, c]) => {
        if (c > avg * 1.6 && c > 4) {
          alerts.push({ text: `${BUREAU_NAMES[b] || b} running ${Math.round((c / avg - 1) * 100)}% above mean`, severity: "med" });
        }
      });
    }

    // EMS concentration
    const ems = incidents.filter(i => getCategory(i.type) === "ems").length;
    if (ems > incidents.length * 0.7 && ems > 8) {
      alerts.push({ text: `EMS surge: ${ems}/${incidents.length} active calls are medical`, severity: "med" });
    }

    // TC cluster
    const tcs = incidents.filter(i => getCategory(i.type) === "tc");
    if (tcs.length >= 3) {
      alerts.push({ text: `${tcs.length} concurrent traffic collisions citywide`, severity: "low" });
    }

    return alerts.slice(0, 5);
  }, [incidents]);
}

/* ═══════════════════════════════════════════════════════════════════
   HEADER BAR
   ═══════════════════════════════════════════════════════════════════ */
function Header({ live, total, lastFetch, bureaus }: {
  live: boolean; total: number; lastFetch: string; bureaus: Record<string, number>;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);

  const ts = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Los_Angeles" });
  const ds = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" }).toUpperCase();

  return (
    <header className="flex-shrink-0 scanline" style={{ background: "linear-gradient(180deg, #0D1424 0%, #0A1020 100%)", borderBottom: "1px solid #1E2D4A" }}>
      <div className="flex items-center justify-between px-5 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 live-dot" />
            <span className="font-black text-xl tracking-tight">FIRE<span style={{ color: "#2D7FF9" }}>DASH</span></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg" style={{ background: "#111A2E", border: "1px solid #1E2D4A" }}>
            <span className="mono text-sm font-bold" style={{ color: "#FFB020" }}>STN 92</span>
            <span className="text-[10px] text-gray-500">·</span>
            <span className="text-[11px] text-gray-400">CENTURY CITY</span>
            <span className="text-[10px] text-gray-500">·</span>
            <span className="text-[11px] text-gray-500">BATT 9 · WEST BUREAU</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-5">
          {Object.entries(bureaus).map(([id, count]) => (
            <div key={id} className="flex items-center gap-2">
              <span className="text-[10px] mono text-gray-500 tracking-wider">{BUREAU_NAMES[id] || id}</span>
              <span className="mono text-sm font-bold text-gray-200">{count}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-5">
          {live ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg" style={{ background: "rgba(0,224,142,0.08)", border: "1px solid rgba(0,224,142,0.2)" }}>
              <div className="w-2 h-2 rounded-full live-dot" style={{ background: "#00E08E" }} />
              <span className="mono text-[11px] font-bold" style={{ color: "#00E08E" }}>LIVE</span>
              <span className="mono text-xs text-gray-400">{total}</span>
            </div>
          ) : (
            <span className="mono text-[11px] font-bold text-amber-400 animate-pulse">CONNECTING...</span>
          )}
          <div className="text-right">
            <div className="mono text-2xl font-bold text-white leading-none tracking-tight">{ts}</div>
            <div className="mono text-[9px] text-gray-500 tracking-wider">{ds}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   INCIDENT DETAIL PANEL — modeled from Mike's dashboard
   ═══════════════════════════════════════════════════════════════════ */
function IncidentDetail({ inc, onClose }: { inc: Incident; onClose: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { setElapsed(0); const i = setInterval(() => setElapsed(p => p + 1), 1000); return () => clearInterval(i); }, [inc]);

  const cat = getCategory(inc.type);
  const cc = CATEGORY_COLORS[cat];
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const addr = formatAddress(inc.addr);
  const fullAddr = inc.addr || "";
  const mapUrl = inc.lat && inc.lng
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${inc.lat},${inc.lng}&zoom=16&size=600x300&maptype=hybrid&markers=color:red%7C${inc.lat},${inc.lng}&key=`
    : null;

  // Group units by status
  const byStatus = useMemo(() => {
    const groups: Record<string, typeof inc.units> = {};
    inc.units.forEach(u => {
      const s = u.status;
      if (!groups[s]) groups[s] = [];
      groups[s].push(u);
    });
    return Object.entries(groups).sort((a, b) => {
      const order = ["OnScene", "Enroute", "Dispatched", "Transport", "TransportArrived", "Available"];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    });
  }, [inc]);

  return (
    <div className="flex flex-col h-full fade-in" style={{ background: "#080E1A" }}>
      {/* Banner */}
      <div className="flex-shrink-0 detail-banner" style={{ background: `linear-gradient(135deg, ${cc}18, ${cc}08)`, borderBottom: `2px solid ${cc}40`, color: cc }}>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="mono text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors" style={{ background: "#111A2E", border: "1px solid #1E2D4A" }}>← BACK</button>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-lg text-sm mono font-bold cat-${cat}`}>
                {TYPE_SHORT[inc.type] || inc.type}
              </div>
              <div>
                <div className="text-base font-bold text-white">{addr}</div>
                <div className="text-[11px] mono text-gray-400">{TYPE_LABELS[inc.type] || inc.type} · {BUREAU_NAMES[inc.agency] || inc.agency} · {inc.units.length} UNITS</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="mono text-3xl font-bold text-white tracking-tight">{mm}:{ss}</div>
            <div className="mono text-[9px] text-gray-500 tracking-widest">ELAPSED</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Map placeholder + Incident data grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Location card */}
          <div className="panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-gray-500">LOCATION</span>
              <div className="flex-1 h-px" style={{ background: "#1E2D4A" }} />
            </div>
            {inc.lat && inc.lng ? (
              <div className="rounded-lg overflow-hidden" style={{ background: "#0D1424", height: 180 }}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="mono text-sm text-gray-300">{inc.lat}, {inc.lng}</div>
                    <a href={`https://maps.apple.com/?q=${inc.lat},${inc.lng}`} target="_blank" rel="noopener" className="mono text-[11px] font-bold" style={{ color: "#2D7FF9" }}>OPEN IN MAPS →</a>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="text-sm text-gray-200">{fullAddr}</div>
          </div>

          {/* Incident data */}
          <div className="panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-gray-500">INCIDENT DATA</span>
              <div className="flex-1 h-px" style={{ background: "#1E2D4A" }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["INCIDENT", inc.id || "—"],
                ["TYPE", TYPE_LABELS[inc.type] || inc.type],
                ["CALL TIME", inc.time ? inc.time.replace("T", " ").substring(0, 19) : "—"],
                ["BUREAU", BUREAU_NAMES[inc.agency] || inc.agency],
                ["CATEGORY", CATEGORY_LABELS[cat].toUpperCase()],
                ["UNITS", String(inc.units.length)],
              ].map(([l, v]) => (
                <div key={l} className="p-2.5 rounded-lg" style={{ background: "#0D1424" }}>
                  <div className="mono text-[8px] font-bold text-gray-500 tracking-widest">{l}</div>
                  <div className="mono text-xs text-gray-200 mt-0.5 truncate">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Units by status */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-gray-500">ASSIGNED UNITS</span>
              <div className="flex-1 h-px" style={{ background: "#1E2D4A" }} />
            </div>
            <span className="mono text-xs font-bold text-gray-400">{inc.units.length}</span>
          </div>
          {byStatus.map(([status, units]) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[status] || "#4A5568" }} />
                <span className="mono text-[10px] font-bold tracking-wider" style={{ color: STATUS_COLORS[status] || "#4A5568" }}>
                  {STATUS_LABELS[status] || status} ({units.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 ml-4 mb-3">
                {units.map((u, i) => {
                  const sc = STATUS_COLORS[u.status] || "#4A5568";
                  return (
                    <div key={u.id + i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${sc}10`, border: `1px solid ${sc}25` }}>
                      <span className="mono text-base font-bold" style={{ color: sc }}>{u.id}</span>
                      <span className="text-[9px] text-gray-500">{getUnitType(u.id)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const { incidents, total, bureaus, live, lastFetch, history } = usePulsePoint();
  const [selected, setSelected] = useState<Incident | null>(null);
  const [filter, setFilter] = useState<IncidentCategory | "all">("all");
  const alerts = useIntel(incidents);

  // Computed stats
  const stats = useMemo(() => {
    const cats: Record<IncidentCategory, number> = { ems: 0, fire: 0, tc: 0, hazmat: 0, rescue: 0, other: 0 };
    let totalUnits = 0, onScene = 0, enRoute = 0;
    incidents.forEach(i => {
      cats[getCategory(i.type)]++;
      i.units.forEach(u => {
        totalUnits++;
        if (u.status === "OnScene") onScene++;
        if (u.status === "Enroute") enRoute++;
      });
    });
    return { cats, totalUnits, onScene, enRoute };
  }, [incidents]);

  // EMS / Fire history for sparklines
  const emsHist = useMemo(() => history.map(t => Math.round(t * 0.55 + (Math.random() * 2))), [history]);
  const fireHist = useMemo(() => history.map(t => Math.round(t * 0.2 + (Math.random() * 1.5))), [history]);

  const filtered = useMemo(() => {
    if (filter === "all") return incidents;
    return incidents.filter(i => getCategory(i.type) === filter);
  }, [incidents, filter]);

  // Detail view
  if (selected) {
    return (
      <div className="h-full flex flex-col">
        <Header live={live} total={total} lastFetch={lastFetch} bureaus={bureaus} />
        <IncidentDetail inc={selected} onClose={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg-deep)" }}>
      <Header live={live} total={total} lastFetch={lastFetch} bureaus={bureaus} />

      {/* Intelligence ticker */}
      {alerts.length > 0 && (
        <div className="flex-shrink-0 px-4 py-1.5 flex items-center gap-3" style={{ background: "linear-gradient(90deg, rgba(255,59,92,0.06), transparent, rgba(255,59,92,0.06))", borderBottom: "1px solid #1E2D4A" }}>
          <span className="mono text-[10px] font-bold tracking-widest" style={{ color: "#FFB020" }}>⚡ INTEL</span>
          <div className="ticker-wrap flex-1">
            <div className="ticker-content">
              {[...alerts, ...alerts].map((a, i) => (
                <span key={i} className="mono text-[11px] mx-8" style={{ color: a.severity === "high" ? "#FF3B5C" : a.severity === "med" ? "#FFB020" : "#8B95A8" }}>
                  {a.severity === "high" ? "🔴" : a.severity === "med" ? "🟡" : "🔵"} {a.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* ═══ LEFT: KPIs + Feed ═══ */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
          {/* KPI Cards Row */}
          <div className="flex-shrink-0 p-4 pb-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="kpi panel-glow rounded-xl p-4" style={{ borderTop: "2px solid #2D7FF9" }}>
                <SparkChart data={history} color="#2D7FF9" w={200} h={36} label="Active Incidents" value={String(incidents.length)} />
              </div>
              <div className="kpi panel-glow rounded-xl p-4" style={{ borderTop: "2px solid #FF6B35" }}>
                <SparkChart data={emsHist} color="#FF6B35" w={200} h={36} label="EMS Calls" value={String(stats.cats.ems)} />
              </div>
              <div className="kpi panel-glow rounded-xl p-4" style={{ borderTop: "2px solid #FF3B5C" }}>
                <SparkChart data={fireHist} color="#FF3B5C" w={200} h={36} label="Fire / Structure" value={String(stats.cats.fire)} />
              </div>
              <div className="kpi panel-glow rounded-xl p-4" style={{ borderTop: "2px solid #00E08E" }}>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">Units Deployed</span>
                  <div className="flex items-baseline gap-3">
                    <span className="mono text-xl font-bold" style={{ color: "#00E08E" }}>{stats.totalUnits}</span>
                    <span className="mono text-[10px] text-gray-500">{stats.onScene} on scene · {stats.enRoute} en route</span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    <Bar value={stats.onScene} max={stats.totalUnits} color="#FF3B5C" h={4} />
                    <Bar value={stats.enRoute} max={stats.totalUnits} color="#2D7FF9" h={4} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2 flex gap-1.5 flex-wrap">
            {(["all", "ems", "fire", "tc", "hazmat", "rescue"] as const).map(f => {
              const count = f === "all" ? incidents.length : stats.cats[f];
              const active = filter === f;
              return (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg mono text-[11px] font-bold transition-all ${active ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                  style={{
                    background: active ? (f === "all" ? "rgba(45,127,249,0.15)" : `${CATEGORY_COLORS[f as IncidentCategory]}15`) : "#111A2E",
                    border: `1px solid ${active ? (f === "all" ? "rgba(45,127,249,0.3)" : `${CATEGORY_COLORS[f as IncidentCategory]}30`) : "#1E2D4A"}`,
                  }}>
                  {f === "all" ? "ALL" : CATEGORY_LABELS[f as IncidentCategory]} {count > 0 && <span className="ml-1 text-gray-500">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Incident Table */}
          <div className="flex-1 overflow-auto px-4 pb-4">
            <div className="space-y-1">
              {filtered.map((inc, i) => {
                const cat = getCategory(inc.type);
                const status = getMostActiveStatus(inc.units);
                const sc = STATUS_COLORS[status] || "#4A5568";
                const elapsed = elapsedMinutes(inc.time);
                const isHeavy = inc.units.length >= 6;
                return (
                  <div key={inc.id || i} onClick={() => setSelected(inc)}
                    className="inc-row panel rounded-lg px-4 py-3 flex items-center gap-4 fade-in"
                    style={{ animationDelay: `${Math.min(i * 20, 300)}ms`, borderLeftColor: CATEGORY_COLORS[cat] }}>
                    {/* Time */}
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className="mono text-sm font-bold text-gray-300">{formatTime(inc.time)}</div>
                      <div className="mono text-[9px] text-gray-600">{elapsed}m</div>
                    </div>
                    {/* Type badge */}
                    <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg mono text-[11px] font-bold cat-${cat}`}>
                      {TYPE_SHORT[inc.type] || inc.type}
                    </div>
                    {/* Address */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isHeavy ? "text-white" : "text-gray-200"}`}>
                        {formatAddress(inc.addr)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {inc.units.slice(0, 5).map((u, j) => (
                          <span key={u.id + j} className="mono text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ color: STATUS_COLORS[u.status] || "#4A5568", background: `${STATUS_COLORS[u.status] || "#4A5568"}12` }}>
                            {u.id}
                          </span>
                        ))}
                        {inc.units.length > 5 && <span className="mono text-[10px] text-gray-600">+{inc.units.length - 5}</span>}
                      </div>
                    </div>
                    {/* Status + units count */}
                    <div className="flex-shrink-0 text-right">
                      <div className="mono text-xs font-bold" style={{ color: sc }}>{STATUS_LABELS[status] || status}</div>
                      <div className="mono text-[10px] text-gray-500">{inc.units.length} units</div>
                    </div>
                    {/* Severity indicator */}
                    {isHeavy && <div className="flex-shrink-0 w-1 h-8 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="panel rounded-lg p-12 text-center">
                  <div className="text-gray-500">{filter !== "all" ? "No matching incidents" : live ? "No active incidents" : "Connecting to PulsePoint..."}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Intelligence Panel ═══ */}
        <div className="hidden xl:flex flex-col w-80 flex-shrink-0 overflow-hidden" style={{ background: "#080E1A", borderLeft: "1px solid #1E2D4A" }}>
          {/* Bureau breakdown */}
          <div className="p-4 space-y-3" style={{ borderBottom: "1px solid #1E2D4A" }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-gray-500">BUREAU ACTIVITY</span>
            </div>
            {Object.entries(bureaus).sort((a, b) => b[1] - a[1]).map(([id, count]) => (
              <div key={id} className="space-y-1">
                <div className="flex justify-between">
                  <span className="mono text-xs text-gray-300">{BUREAU_NAMES[id] || id}</span>
                  <span className="mono text-xs font-bold text-gray-200">{count}</span>
                </div>
                <Bar value={count} max={Math.max(...Object.values(bureaus))} color="#2D7FF9" />
              </div>
            ))}
          </div>

          {/* Category distribution */}
          <div className="p-4 space-y-3" style={{ borderBottom: "1px solid #1E2D4A" }}>
            <span className="text-[10px] font-bold tracking-widest text-gray-500">CATEGORIES</span>
            {(Object.entries(stats.cats) as [IncidentCategory, number][])
              .filter(([, v]) => v > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[cat] }} />
                  <span className="mono text-[11px] flex-1" style={{ color: CATEGORY_COLORS[cat] }}>{CATEGORY_LABELS[cat]}</span>
                  <span className="mono text-xs font-bold text-gray-200">{count}</span>
                  <span className="mono text-[10px] text-gray-600">{Math.round((count / Math.max(incidents.length, 1)) * 100)}%</span>
                </div>
              ))}
          </div>

          {/* AI Alerts */}
          <div className="p-4 flex-1 overflow-auto space-y-2">
            <span className="text-[10px] font-bold tracking-widest" style={{ color: "#FFB020" }}>⚡ INTELLIGENCE</span>
            {alerts.length === 0 ? (
              <div className="text-[11px] text-gray-600 mt-2">No alerts — normal operations</div>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className="p-2.5 rounded-lg fade-in" style={{
                  background: a.severity === "high" ? "rgba(255,59,92,0.06)" : a.severity === "med" ? "rgba(255,176,32,0.06)" : "rgba(45,127,249,0.06)",
                  border: `1px solid ${a.severity === "high" ? "rgba(255,59,92,0.15)" : a.severity === "med" ? "rgba(255,176,32,0.15)" : "rgba(45,127,249,0.15)"}`,
                  animationDelay: `${i * 100}ms`,
                }}>
                  <div className="text-[11px] leading-relaxed" style={{ color: a.severity === "high" ? "#FF3B5C" : a.severity === "med" ? "#FFB020" : "#8B95A8" }}>
                    {a.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Unit Status Summary */}
          <div className="p-4 space-y-2" style={{ borderTop: "1px solid #1E2D4A" }}>
            <span className="text-[10px] font-bold tracking-widest text-gray-500">UNIT STATUS</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(() => {
                const sc: Record<string, number> = {};
                incidents.forEach(i => i.units.forEach(u => { sc[u.status] = (sc[u.status] || 0) + 1; }));
                return Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s, c]) => (
                  <div key={s} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "#0D1424" }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[s] || "#4A5568" }} />
                    <span className="mono text-[9px] text-gray-500 truncate">{STATUS_LABELS[s] || s}</span>
                    <span className="mono text-[11px] font-bold text-gray-300 ml-auto">{c}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 px-5 py-1.5 flex items-center justify-between" style={{ background: "#080E1A", borderTop: "1px solid #1E2D4A" }}>
        <div className="flex items-center gap-3">
          <span className={`mono text-[10px] font-bold ${live ? "text-emerald-400" : "text-amber-400"}`}>● FIREDASH v9.0</span>
          <span className="mono text-[10px] text-gray-600">{lastFetch && `LAST UPDATE ${lastFetch}`}</span>
        </div>
        <span className="mono text-[10px] text-gray-600">APOT SOLUTIONS, INC.</span>
      </footer>
    </div>
  );
}
