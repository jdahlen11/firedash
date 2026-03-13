import { useState, useEffect, useMemo } from "react";
import {
  usePulsePoint, Incident, Unit,
  TYPE_LABELS, TYPE_SHORT, STATUS_LABELS, STATUS_COLORS,
  BUREAU_NAMES, CATEGORY_COLORS, CATEGORY_LABELS,
  getCategory, getMostActiveStatus, getUnitType,
  formatTime, formatAddress, elapsedMinutes,
  IncidentCategory,
} from "./hooks";

// ═══════════════════════════════════════════════════════════════════
// SPARKLINE — Inline SVG mini chart
// ═══════════════════════════════════════════════════════════════════
function Sparkline({ data, color = "#3B82F6", w = 80, h = 28 }: {
  data: number[]; color?: string; w?: number; h?: number;
}) {
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length - 1] - min) / range) * (h - 4) - 2} r="2" fill={color} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MINI BAR — Horizontal percentage bar
// ═══════════════════════════════════════════════════════════════════
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-navy-800 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════════════
function KpiCard({ label, value, sub, color, spark, trend }: {
  label: string; value: string | number; sub?: string; color: string;
  spark?: number[]; trend?: "up" | "down" | "flat";
}) {
  return (
    <div className="kpi-card glass-strong rounded-xl p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase truncate">{label}</span>
        {trend && (
          <span className={`text-[10px] font-mono font-bold ${trend === "up" ? "text-accent-red" : trend === "down" ? "text-accent-emerald" : "text-gray-500"}`}>
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "━"}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="font-mono text-3xl font-bold leading-none" style={{ color }}>{value}</span>
        {spark && spark.length > 1 && <Sparkline data={spark} color={color} />}
      </div>
      {sub && <span className="text-[10px] font-mono text-gray-500 truncate">{sub}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AI ALERT — Pattern detection
// ═══════════════════════════════════════════════════════════════════
function useAiAlerts(incidents: Incident[]): string[] {
  return useMemo(() => {
    const alerts: string[] = [];
    if (incidents.length === 0) return alerts;

    // Bureau concentration
    const bureauCounts: Record<string, number> = {};
    incidents.forEach((i) => { bureauCounts[i.agency] = (bureauCounts[i.agency] || 0) + 1; });
    const entries = Object.entries(bureauCounts);
    if (entries.length > 1) {
      const avg = incidents.length / entries.length;
      entries.forEach(([b, c]) => {
        if (c > avg * 1.5 && c > 5) {
          alerts.push(`${BUREAU_NAMES[b] || b} bureau running ${Math.round((c / avg - 1) * 100)}% above average activity`);
        }
      });
    }

    // EMS surge
    const emsCount = incidents.filter((i) => getCategory(i.type) === "ems").length;
    if (emsCount > incidents.length * 0.7 && emsCount > 10) {
      alerts.push(`High EMS concentration: ${emsCount} of ${incidents.length} active calls are medical`);
    }

    // Multi-unit incidents
    const multiUnit = incidents.filter((i) => i.units.length >= 6);
    if (multiUnit.length > 0) {
      alerts.push(`${multiUnit.length} significant incident${multiUnit.length > 1 ? "s" : ""} with 6+ units assigned`);
    }

    // Structure fires
    const structureFires = incidents.filter((i) => ["SF", "RF", "CF", "WSF", "WRF", "WCF", "FULL"].includes(i.type));
    if (structureFires.length >= 2) {
      alerts.push(`${structureFires.length} active structure fire${structureFires.length > 1 ? "s" : ""} across the city`);
    }

    return alerts.slice(0, 3);
  }, [incidents]);
}

// ═══════════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════════
type Tab = "dashboard" | "incidents" | "units" | "analytics";

function Header({ live, total, lastFetch, bureaus }: {
  live: boolean; total: number; lastFetch: string; bureaus: Record<string, number>;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);

  const ts = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Los_Angeles" });
  const ds = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Los_Angeles" }).toUpperCase();

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-navy-700 bg-navy-900/80 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-red live-dot" />
          <span className="font-black text-lg tracking-tight text-white">FIRE<span className="text-accent-blue">DASH</span></span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded bg-navy-800">
          <span className="font-mono text-xs font-bold text-accent-amber">92</span>
          <span className="text-[10px] text-gray-500">CENTURY CITY</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-4">
        {Object.entries(bureaus).map(([id, count]) => (
          <div key={id} className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-gray-500">{BUREAU_NAMES[id] || id}</span>
            <span className="text-xs font-mono font-bold text-gray-300">{count}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {live ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald live-dot" />
              <span className="font-mono text-[10px] font-semibold text-accent-emerald">LIVE</span>
              <span className="font-mono text-[10px] text-gray-500">{total} ACTIVE</span>
            </>
          ) : (
            <span className="font-mono text-[10px] text-accent-amber animate-pulse">CONNECTING...</span>
          )}
        </div>
        <div className="hidden sm:block text-right">
          <div className="font-mono text-xl font-bold text-white leading-none">{ts}</div>
          <div className="font-mono text-[9px] text-gray-500">{ds}{lastFetch ? ` · ${lastFetch}` : ""}</div>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════════
function DashboardView({ incidents, history, bureaus }: {
  incidents: Incident[]; history: number[]; bureaus: Record<string, number>;
}) {
  const alerts = useAiAlerts(incidents);

  const stats = useMemo(() => {
    const cats: Record<IncidentCategory, number> = { ems: 0, fire: 0, tc: 0, hazmat: 0, rescue: 0, other: 0 };
    let totalUnits = 0;
    let onSceneCount = 0;
    incidents.forEach((i) => {
      cats[getCategory(i.type)]++;
      i.units.forEach((u) => {
        totalUnits++;
        if (u.status === "OnScene") onSceneCount++;
      });
    });
    return { cats, totalUnits, onSceneCount };
  }, [incidents]);

  const emsHistory = useMemo(() => {
    // Simulate EMS trend from incident types
    return history.map((t) => Math.round(t * 0.6 + Math.random() * 3));
  }, [history]);

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Active Incidents" value={incidents.length} color="#3B82F6"
          spark={history} sub={`${stats.totalUnits} units deployed`} trend={history.length > 1 && history[history.length - 1] > history[history.length - 2] ? "up" : "flat"} />
        <KpiCard label="EMS Calls" value={stats.cats.ems} color="#F97316"
          spark={emsHistory} sub={`${Math.round((stats.cats.ems / Math.max(incidents.length, 1)) * 100)}% of active`} />
        <KpiCard label="Fire / Structure" value={stats.cats.fire} color="#EF4444"
          sub={`${stats.cats.fire} fire · ${stats.cats.tc} TC`} />
        <KpiCard label="On Scene" value={stats.onSceneCount} color="#10B981"
          sub={`of ${stats.totalUnits} total units`} />
      </div>

      {/* AI Alerts */}
      {alerts.length > 0 && (
        <div className="glass rounded-lg px-4 py-2.5 flex items-start gap-3 animate-fade-in">
          <span className="text-accent-amber text-sm mt-0.5">⚡</span>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold tracking-wider text-accent-amber">INTELLIGENCE</span>
            <div className="mt-1 space-y-1">
              {alerts.map((a, i) => (
                <p key={i} className="text-xs text-gray-300 leading-relaxed">{a}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two column: Feed + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Feed */}
        <div className="lg:col-span-2 glass rounded-xl overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 340px)" }}>
          <div className="px-4 py-2.5 border-b border-navy-700 flex items-center justify-between flex-shrink-0">
            <span className="text-[11px] font-bold tracking-wider text-gray-400">LIVE INCIDENT FEED</span>
            <span className="text-[10px] font-mono text-gray-500">{incidents.length} ACTIVE</span>
          </div>
          <div className="flex-1 overflow-auto">
            {incidents.map((inc, i) => {
              const cat = getCategory(inc.type);
              const status = getMostActiveStatus(inc.units);
              const elapsed = elapsedMinutes(inc.time);
              return (
                <div key={inc.id || i} className="incident-row px-4 py-2.5 border-b border-navy-800/50 flex items-center gap-3"
                  style={{ animationDelay: `${i * 30}ms`, borderLeft: `3px solid ${CATEGORY_COLORS[cat]}` }}>
                  <div className="flex-shrink-0 w-12">
                    <span className="font-mono text-xs text-gray-500">{formatTime(inc.time)}</span>
                  </div>
                  <div className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold badge-${cat}`}>
                    {TYPE_SHORT[inc.type] || inc.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate">{formatAddress(inc.addr)}</div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {inc.units.slice(0, 4).map((u) => u.id).join(", ")}
                      {inc.units.length > 4 && ` +${inc.units.length - 4}`}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-mono text-xs font-bold" style={{ color: STATUS_COLORS[status] || "#6B7280" }}>
                      {STATUS_LABELS[status] || status}
                    </div>
                    <div className="font-mono text-[10px] text-gray-500">{elapsed}m · {inc.units.length} units</div>
                  </div>
                </div>
              );
            })}
            {incidents.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No active incidents</div>
            )}
          </div>
        </div>

        {/* Type Breakdown + Bureau */}
        <div className="space-y-4">
          {/* Category Breakdown */}
          <div className="glass rounded-xl p-4">
            <span className="text-[11px] font-bold tracking-wider text-gray-400">BY CATEGORY</span>
            <div className="mt-3 space-y-2.5">
              {(Object.entries(stats.cats) as [IncidentCategory, number][])
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold w-12" style={{ color: CATEGORY_COLORS[cat] }}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <div className="flex-1"><MiniBar value={count} max={incidents.length} color={CATEGORY_COLORS[cat]} /></div>
                    <span className="font-mono text-xs text-gray-300 w-6 text-right">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Bureau Breakdown */}
          <div className="glass rounded-xl p-4">
            <span className="text-[11px] font-bold tracking-wider text-gray-400">BY BUREAU</span>
            <div className="mt-3 space-y-2.5">
              {Object.entries(bureaus)
                .sort((a, b) => b[1] - a[1])
                .map(([id, count]) => (
                  <div key={id} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold w-16 text-gray-300">
                      {BUREAU_NAMES[id] || id}
                    </span>
                    <div className="flex-1"><MiniBar value={count} max={Math.max(...Object.values(bureaus))} color="#3B82F6" /></div>
                    <span className="font-mono text-xs text-gray-300 w-6 text-right">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Unit Status Summary */}
          <div className="glass rounded-xl p-4">
            <span className="text-[11px] font-bold tracking-wider text-gray-400">UNIT STATUS</span>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(() => {
                const statusCounts: Record<string, number> = {};
                incidents.forEach((i) => i.units.forEach((u) => {
                  statusCounts[u.status] = (statusCounts[u.status] || 0) + 1;
                }));
                return Object.entries(statusCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([s, c]) => (
                    <div key={s} className="flex items-center gap-2 px-2 py-1.5 rounded bg-navy-800/50">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[s] || "#6B7280" }} />
                      <span className="text-[10px] font-mono text-gray-400">{STATUS_LABELS[s] || s}</span>
                      <span className="font-mono text-xs font-bold text-gray-200 ml-auto">{c}</span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// INCIDENTS VIEW
// ═══════════════════════════════════════════════════════════════════
function IncidentsView({ incidents }: { incidents: Incident[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<IncidentCategory | "all">("all");
  const [selected, setSelected] = useState<Incident | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!selected) return;
    setElapsed(0);
    const i = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(i);
  }, [selected]);

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (filter !== "all" && getCategory(i.type) !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (i.addr || "").toLowerCase().includes(q)
          || (TYPE_LABELS[i.type] || i.type).toLowerCase().includes(q)
          || i.units.some((u) => u.id.toLowerCase().includes(q))
          || (i.id || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [incidents, search, filter]);

  // Detail view
  if (selected) {
    const inc = selected;
    const cat = getCategory(inc.type);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    return (
      <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        {/* Banner */}
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
          style={{ background: `${CATEGORY_COLORS[cat]}15`, borderBottom: `2px solid ${CATEGORY_COLORS[cat]}40` }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(null)} className="text-xs font-mono font-bold text-gray-400 hover:text-white px-2 py-1 rounded border border-navy-700 hover:border-gray-500 transition-colors">← BACK</button>
            <div className={`px-2 py-0.5 rounded text-xs font-mono font-bold badge-${cat}`}>{TYPE_SHORT[inc.type] || inc.type}</div>
            <div>
              <div className="text-sm font-bold text-white">{formatAddress(inc.addr)}</div>
              <div className="text-[10px] font-mono text-gray-400">{TYPE_LABELS[inc.type] || inc.type} · {BUREAU_NAMES[inc.agency] || inc.agency}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-bold text-white">{mm}:{ss}</div>
            <div className="text-[9px] font-mono text-gray-500">ELAPSED</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Incident Data */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              ["INCIDENT ID", inc.id || "—"],
              ["TYPE", TYPE_LABELS[inc.type] || inc.type],
              ["CALL TIME", inc.time ? inc.time.replace("T", " ").replace("Z", "") : "—"],
              ["BUREAU", BUREAU_NAMES[inc.agency] || inc.agency],
              ["LATITUDE", inc.lat || "—"],
              ["LONGITUDE", inc.lng || "—"],
            ].map(([label, value]) => (
              <div key={label} className="p-3 rounded-lg bg-navy-800/50">
                <div className="text-[9px] font-mono font-semibold text-gray-500 tracking-wider">{label}</div>
                <div className="text-sm font-mono text-gray-200 mt-0.5">{value}</div>
              </div>
            ))}
          </div>

          {/* Units */}
          <div>
            <div className="text-[11px] font-bold tracking-wider text-gray-400 mb-2">ASSIGNED UNITS — {inc.units.length}</div>
            <div className="space-y-1">
              {inc.units.map((u, i) => {
                const sc = STATUS_COLORS[u.status] || "#6B7280";
                return (
                  <div key={u.id + i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-navy-800/50"
                    style={{ borderLeft: `3px solid ${sc}` }}>
                    <span className="font-mono text-lg font-bold" style={{ color: sc }}>{u.id}</span>
                    <span className="text-xs text-gray-400 flex-1">{getUnitType(u.id)}</span>
                    <span className="font-mono text-xs font-bold" style={{ color: sc }}>{STATUS_LABELS[u.status] || u.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search & Filter */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-navy-700 space-y-2">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search address, type, unit..."
          className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-500 outline-none focus:border-accent-blue/50 transition-colors" />
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "ems", "fire", "tc", "hazmat", "rescue", "other"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                filter === f ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30" : "bg-navy-800 text-gray-400 border border-navy-700 hover:border-gray-500"
              }`}>
              {f === "all" ? "ALL" : CATEGORY_LABELS[f]}
              {f !== "all" && <span className="ml-1 text-gray-500">{incidents.filter((i) => getCategory(i.type) === f).length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Table Header */}
      <div className="flex-shrink-0 px-4 py-2 bg-navy-800/50 grid gap-3" style={{ gridTemplateColumns: "50px 60px 1fr 140px 90px" }}>
        <span className="text-[9px] font-mono font-bold text-gray-500">TIME</span>
        <span className="text-[9px] font-mono font-bold text-gray-500">TYPE</span>
        <span className="text-[9px] font-mono font-bold text-gray-500">ADDRESS</span>
        <span className="text-[9px] font-mono font-bold text-gray-500">UNITS</span>
        <span className="text-[9px] font-mono font-bold text-gray-500 text-right">STATUS</span>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-auto">
        {filtered.map((inc, i) => {
          const cat = getCategory(inc.type);
          const status = getMostActiveStatus(inc.units);
          const sc = STATUS_COLORS[status] || "#6B7280";
          return (
            <div key={inc.id || i} onClick={() => setSelected(inc)}
              className="incident-row px-4 py-2.5 grid gap-3 border-b border-navy-800/30 cursor-pointer"
              style={{ gridTemplateColumns: "50px 60px 1fr 140px 90px", borderLeft: `3px solid ${CATEGORY_COLORS[cat]}` }}>
              <span className="font-mono text-xs text-gray-500">{formatTime(inc.time)}</span>
              <span className={`text-[10px] font-mono font-bold badge-${cat} px-1.5 py-0.5 rounded text-center self-center`}>
                {TYPE_SHORT[inc.type] || inc.type}
              </span>
              <span className="text-sm text-gray-200 truncate self-center">{formatAddress(inc.addr)}</span>
              <div className="flex gap-1 flex-wrap self-center overflow-hidden">
                {inc.units.slice(0, 3).map((u, j) => (
                  <span key={u.id + j} className="text-[10px] font-mono font-bold px-1 rounded"
                    style={{ color: STATUS_COLORS[u.status] || "#6B7280", background: `${STATUS_COLORS[u.status] || "#6B7280"}15` }}>
                    {u.id}
                  </span>
                ))}
                {inc.units.length > 3 && <span className="text-[10px] font-mono text-gray-500">+{inc.units.length - 3}</span>}
              </div>
              <span className="font-mono text-[11px] font-bold text-right self-center" style={{ color: sc }}>
                {STATUS_LABELS[status] || status}
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">
            {search || filter !== "all" ? "No matching incidents" : "No active incidents"}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// UNITS VIEW
// ═══════════════════════════════════════════════════════════════════
function UnitsView({ incidents }: { incidents: Incident[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const allUnits = useMemo(() => {
    const map = new Map<string, { unit: Unit; incident: Incident; cat: IncidentCategory }>();
    incidents.forEach((i) => {
      const cat = getCategory(i.type);
      i.units.forEach((u) => {
        if (!map.has(u.id)) map.set(u.id, { unit: u, incident: i, cat });
      });
    });
    return Array.from(map.values()).sort((a, b) => a.unit.id.localeCompare(b.unit.id));
  }, [incidents]);

  const filtered = statusFilter === "all" ? allUnits : allUnits.filter((u) => u.unit.status === statusFilter);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allUnits.forEach((u) => { counts[u.unit.status] = (counts[u.unit.status] || 0) + 1; });
    return counts;
  }, [allUnits]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filter chips */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-navy-700">
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setStatusFilter("all")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
              statusFilter === "all" ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30" : "bg-navy-800 text-gray-400 border border-navy-700"
            }`}>
            ALL <span className="text-gray-500">{allUnits.length}</span>
          </button>
          {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([s, c]) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                statusFilter === s ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30" : "bg-navy-800 text-gray-400 border border-navy-700"
              }`}>
              {STATUS_LABELS[s] || s} <span className="text-gray-500">{c}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Unit Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {filtered.map(({ unit, incident, cat }) => {
            const sc = STATUS_COLORS[unit.status] || "#6B7280";
            return (
              <div key={unit.id} className="glass rounded-lg p-3 flex flex-col gap-2 kpi-card" style={{ borderLeft: `3px solid ${sc}` }}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-bold" style={{ color: sc }}>{unit.id}</span>
                  <div className="w-2 h-2 rounded-full" style={{ background: sc }} />
                </div>
                <div className="text-[9px] font-mono text-gray-500">{getUnitType(unit.id)}</div>
                <div className="text-[10px] font-mono font-bold" style={{ color: sc }}>{STATUS_LABELS[unit.status] || unit.status}</div>
                <div className="text-[10px] text-gray-400 truncate">{formatAddress(incident.addr)}</div>
                <div className={`text-[9px] font-mono font-bold badge-${cat} px-1.5 py-0.5 rounded text-center`}>
                  {TYPE_SHORT[incident.type] || incident.type}
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">No units match filter</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS VIEW
// ═══════════════════════════════════════════════════════════════════
function AnalyticsView({ incidents, history, bureaus }: {
  incidents: Incident[]; history: number[]; bureaus: Record<string, number>;
}) {
  const stats = useMemo(() => {
    const cats: Record<IncidentCategory, number> = { ems: 0, fire: 0, tc: 0, hazmat: 0, rescue: 0, other: 0 };
    const unitsByType: Record<string, number> = {};
    const statusDist: Record<string, number> = {};
    let totalUnits = 0;
    let maxUnitsPerInc = 0;

    incidents.forEach((i) => {
      cats[getCategory(i.type)]++;
      maxUnitsPerInc = Math.max(maxUnitsPerInc, i.units.length);
      i.units.forEach((u) => {
        totalUnits++;
        const ut = getUnitType(u.id);
        unitsByType[ut] = (unitsByType[ut] || 0) + 1;
        statusDist[u.status] = (statusDist[u.status] || 0) + 1;
      });
    });

    const bureauEntries = Object.entries(bureaus).sort((a, b) => b[1] - a[1]);
    const maxBureau = bureauEntries.length > 0 ? bureauEntries[0][1] : 1;

    return { cats, unitsByType, statusDist, totalUnits, maxUnitsPerInc, bureauEntries, maxBureau };
  }, [incidents, bureaus]);

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-[10px] font-bold tracking-wider text-gray-400">TOTAL INCIDENTS</div>
          <div className="font-mono text-3xl font-bold text-accent-blue mt-1">{incidents.length}</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-[10px] font-bold tracking-wider text-gray-400">TOTAL UNITS</div>
          <div className="font-mono text-3xl font-bold text-accent-emerald mt-1">{stats.totalUnits}</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-[10px] font-bold tracking-wider text-gray-400">MAX UNITS/CALL</div>
          <div className="font-mono text-3xl font-bold text-accent-amber mt-1">{stats.maxUnitsPerInc}</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-[10px] font-bold tracking-wider text-gray-400">BUREAUS ACTIVE</div>
          <div className="font-mono text-3xl font-bold text-white mt-1">{Object.keys(bureaus).length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity Trend */}
        <div className="glass rounded-xl p-4">
          <span className="text-[11px] font-bold tracking-wider text-gray-400">ACTIVITY TREND</span>
          <div className="mt-3">
            <Sparkline data={history} color="#3B82F6" w={400} h={80} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] font-mono text-gray-500">{history.length} data points</span>
            <span className="text-[9px] font-mono text-gray-500">25s intervals</span>
          </div>
        </div>

        {/* Bureau Distribution */}
        <div className="glass rounded-xl p-4">
          <span className="text-[11px] font-bold tracking-wider text-gray-400">BUREAU DISTRIBUTION</span>
          <div className="mt-3 space-y-3">
            {stats.bureauEntries.map(([id, count]) => (
              <div key={id}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-mono text-gray-300">{BUREAU_NAMES[id] || id}</span>
                  <span className="font-mono text-xs font-bold text-gray-200">{count}</span>
                </div>
                <MiniBar value={count} max={stats.maxBureau} color="#3B82F6" />
              </div>
            ))}
          </div>
        </div>

        {/* Incident Types */}
        <div className="glass rounded-xl p-4">
          <span className="text-[11px] font-bold tracking-wider text-gray-400">INCIDENT CATEGORIES</span>
          <div className="mt-3 space-y-3">
            {(Object.entries(stats.cats) as [IncidentCategory, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-mono" style={{ color: CATEGORY_COLORS[cat] }}>{CATEGORY_LABELS[cat]}</span>
                    <span className="font-mono text-xs font-bold text-gray-200">{count} <span className="text-gray-500">({Math.round((count / Math.max(incidents.length, 1)) * 100)}%)</span></span>
                  </div>
                  <MiniBar value={count} max={incidents.length} color={CATEGORY_COLORS[cat]} />
                </div>
              ))}
          </div>
        </div>

        {/* Unit Types */}
        <div className="glass rounded-xl p-4">
          <span className="text-[11px] font-bold tracking-wider text-gray-400">UNIT TYPES DEPLOYED</span>
          <div className="mt-3 space-y-3">
            {Object.entries(stats.unitsByType)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-mono text-gray-300">{type}</span>
                    <span className="font-mono text-xs font-bold text-gray-200">{count}</span>
                  </div>
                  <MiniBar value={count} max={stats.totalUnits} color="#06B6D4" />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// APP — Main Application
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const { incidents, total, bureaus, live, lastFetch, history } = usePulsePoint();
  const [tab, setTab] = useState<Tab>("dashboard");

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "incidents", label: "Incidents", count: incidents.length },
    { key: "units", label: "Units" },
    { key: "analytics", label: "Analytics" },
  ];

  return (
    <div className="h-full flex flex-col bg-navy-950 scanline">
      <Header live={live} total={total} lastFetch={lastFetch} bureaus={bureaus} />

      {/* Tab Bar */}
      <nav className="flex-shrink-0 px-4 flex gap-1 border-b border-navy-700 bg-navy-900/50">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key ? "text-white tab-active" : "text-gray-500 hover:text-gray-300"
            }`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                tab === t.key ? "bg-accent-blue/20 text-accent-blue" : "bg-navy-800 text-gray-500"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      {tab === "dashboard" && <DashboardView incidents={incidents} history={history} bureaus={bureaus} />}
      {tab === "incidents" && <IncidentsView incidents={incidents} />}
      {tab === "units" && <UnitsView incidents={incidents} />}
      {tab === "analytics" && <AnalyticsView incidents={incidents} history={history} bureaus={bureaus} />}

      {/* Footer */}
      <footer className="flex-shrink-0 px-4 py-1.5 border-t border-navy-700 bg-navy-900/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono font-semibold ${live ? "text-accent-emerald" : "text-accent-amber"}`}>● FIREDASH v8.0</span>
          <span className="text-[10px] font-mono text-gray-600">STN 92 · WEST BUREAU · BATT 9</span>
        </div>
        <span className="text-[10px] font-mono text-gray-600">APOT SOLUTIONS, INC.</span>
      </footer>
    </div>
  );
}

