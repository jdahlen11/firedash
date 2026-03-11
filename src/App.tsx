import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, Cell
} from "recharts";
import {
  Activity, AlertTriangle, Clock, Shield, Truck, Flame, Heart,
  Building2, Thermometer, Wind, Droplets, Phone, Navigation,
  BarChart3, Layers, Wifi, BellRing, ArrowUpRight, ArrowDownRight,
  Timer, Hospital, Map as MapIcon, Radio, Zap, Eye, Users,
  ChevronRight, Signal, Target, Route, Compass, CircleDot,
  type LucideIcon
} from "lucide-react";

const C = {
  bg: "#05090f", surface: "#0a1018", card: "#0f1722", cardAlt: "#131d2b",
  border: "#1a2535", borderLight: "#243044",
  red: "#ef4444", redDim: "#7f1d1d", amber: "#f59e0b", amberDim: "#78350f",
  green: "#22c55e", greenDim: "#14532d", blue: "#3b82f6", blueDim: "#1e3a5f",
  cyan: "#06b6d4", purple: "#a855f7", orange: "#f97316",
  text: "#e2e8f0", textDim: "#94a3b8", textMuted: "#64748b", textFaint: "#475569",
} as const;

const WX_ALERT = { tempHigh: 85, tempLow: 40, wind: 25, humidityLow: 15, precipHigh: 50 };
const TURNOUT = { fire: 80, ems: 60, travelLimit: 240 };

type UnitStatus = "AVAIL" | "DISPATCHED" | "ENROUTE" | "ONSCENE" | "TRANSPORTING" | "ATHOSPITAL" | "OFFDUTY";
const STATUS_COLORS: Record<UnitStatus, string> = {
  AVAIL: C.green, DISPATCHED: C.blue, ENROUTE: C.cyan,
  ONSCENE: C.amber, TRANSPORTING: C.purple, ATHOSPITAL: C.red, OFFDUTY: C.textFaint,
};

interface Unit { name: string; type: "T" | "E" | "RA" | "FR"; status: UnitStatus; incNo?: string }
interface Station { id: number; code: string; battalion: number; units: Unit[]; }

const STATIONS_B18: Station[] = [
  { id: 34, code: "34", battalion: 18, units: [
    { name: "E34", type: "E", status: "AVAIL" }, { name: "E464", type: "E", status: "AVAIL" },
    { name: "RA34", type: "RA", status: "TRANSPORTING", incNo: "026-0419" }, { name: "RA834", type: "RA", status: "AVAIL" },
  ]},
  { id: 43, code: "43", battalion: 18, units: [
    { name: "E43", type: "E", status: "ONSCENE", incNo: "026-0421" }, { name: "RA43", type: "RA", status: "AVAIL" },
  ]},
  { id: 58, code: "58", battalion: 18, units: [
    { name: "T58", type: "T", status: "AVAIL" }, { name: "E258", type: "E", status: "AVAIL" },
    { name: "E458", type: "E", status: "AVAIL" }, { name: "RA58", type: "RA", status: "ONSCENE", incNo: "026-0418" },
    { name: "RA858", type: "RA", status: "AVAIL" },
  ]},
  { id: 61, code: "61", battalion: 18, units: [
    { name: "T61", type: "T", status: "ONSCENE", incNo: "026-0421" },
    { name: "E261", type: "E", status: "AVAIL" }, { name: "E61", type: "E", status: "AVAIL" },
    { name: "RA61", type: "RA", status: "AVAIL" }, { name: "RA661", type: "RA", status: "AVAIL" },
    { name: "RA861", type: "RA", status: "AVAIL" },
  ]},
  { id: 68, code: "68", battalion: 18, units: [
    { name: "E68", type: "E", status: "ONSCENE", incNo: "026-0420" },
    { name: "RA68", type: "RA", status: "AVAIL" }, { name: "RA868", type: "RA", status: "AVAIL" },
  ]},
  { id: 92, code: "92", battalion: 18, units: [
    { name: "T92", type: "T", status: "ONSCENE", incNo: "026-0422" },
    { name: "E292", type: "E", status: "ONSCENE", incNo: "026-0422" },
    { name: "E492", type: "E", status: "ENROUTE", incNo: "026-0422" },
    { name: "RA692", type: "RA", status: "ATHOSPITAL", incNo: "026-0417" },
    { name: "RA92", type: "RA", status: "DISPATCHED", incNo: "026-0423" },
  ]},
  { id: 94, code: "94", battalion: 18, units: [
    { name: "T94", type: "T", status: "AVAIL" }, { name: "E294", type: "E", status: "AVAIL" },
    { name: "E94", type: "E", status: "AVAIL" }, { name: "RA894", type: "RA", status: "AVAIL" },
    { name: "RA94", type: "RA", status: "AVAIL" },
  ]},
];

const STATIONS_B9: Station[] = [
  { id: 19, code: "19", battalion: 9, units: [{ name: "E19", type: "E", status: "AVAIL" }, { name: "RA19", type: "RA", status: "AVAIL" }]},
  { id: 23, code: "23", battalion: 9, units: [{ name: "E23", type: "E", status: "ONSCENE", incNo: "026-0415" }, { name: "E469", type: "E", status: "AVAIL" }, { name: "RA23", type: "RA", status: "AVAIL" }]},
  { id: 37, code: "37", battalion: 9, units: [{ name: "T37", type: "T", status: "AVAIL" }, { name: "E237", type: "E", status: "AVAIL" }, { name: "E37", type: "E", status: "AVAIL" }, { name: "RA37", type: "RA", status: "AVAIL" }]},
  { id: 59, code: "59", battalion: 9, units: [{ name: "E1B", type: "E", status: "AVAIL" }, { name: "E1C", type: "E", status: "AVAIL" }, { name: "RA59", type: "RA", status: "AVAIL" }]},
  { id: 69, code: "69", battalion: 9, units: [{ name: "T69", type: "T", status: "AVAIL" }, { name: "E269", type: "E", status: "AVAIL" }, { name: "E69", type: "E", status: "AVAIL" }, { name: "RA669", type: "RA", status: "AVAIL" }, { name: "RA69", type: "RA", status: "AVAIL" }]},
  { id: 71, code: "71", battalion: 9, units: [{ name: "E71", type: "E", status: "AVAIL" }, { name: "RA71", type: "RA", status: "AVAIL" }]},
];

interface HospitalData { name: string; code: string; status: "OPEN" | "ED SATURATION" | "CLOSED" | "ALS DIVERT"; apot: number; dist: number; travel: number; atFac: number; enRoute: number; }
const HOSPITALS: HospitalData[] = [
  { name: "Cedars Marina Del Rey", code: "CEDARS MDR", status: "OPEN", apot: 30, dist: 4.8, travel: 14, atFac: 1, enRoute: 0 },
  { name: "Cedars Medical Center", code: "CEDARS MCTR", status: "OPEN", apot: 120, dist: 2.8, travel: 12, atFac: 2, enRoute: 2 },
  { name: "Kaiser West LA", code: "KAISER WLA", status: "OPEN", apot: 10, dist: 2.7, travel: 10, atFac: 1, enRoute: 1 },
  { name: "St. Johns Santa Monica", code: "ST JOHNS SM", status: "OPEN", apot: 140, dist: 3.6, travel: 8, atFac: 0, enRoute: 1 },
  { name: "UCLA Ronald Reagan", code: "UCLA RR", status: "OPEN", apot: 76, dist: 1.8, travel: 7, atFac: 1, enRoute: 0 },
  { name: "UCLA Santa Monica", code: "UCLA SM", status: "ED SATURATION", apot: 55, dist: 4.1, travel: 12, atFac: 0, enRoute: 0 },
  { name: "West LA VA", code: "WLA VA", status: "CLOSED", apot: 150, dist: 2.2, travel: 6, atFac: 0, enRoute: 0 },
];

interface ActiveCall { time: string; type: string; typeCode: string; addr: string; units: string[]; incNo: string; status: string; priority: number; }
const ACTIVE_CALLS: ActiveCall[] = [
  { time: "22:01:00", type: "ALS", typeCode: "MA", addr: "10342 DUNKIRK AVE X COMSTOCK AVE", units: ["RA92","E292"], incNo: "026-0423", status: "DISPATCHED", priority: 1 },
  { time: "21:47:22", type: "STR", typeCode: "STR", addr: "1800 CENTURY PARK E", units: ["T92","E492","E292"], incNo: "026-0422", status: "ON SCENE", priority: 2 },
  { time: "21:31:00", type: "ALS", typeCode: "MA", addr: "914 WESTWOOD X LE CONTE", units: ["RA34","E34"], incNo: "026-0419", status: "TRANSPORTING", priority: 1 },
  { time: "21:15:44", type: "EMS", typeCode: "MA", addr: "10250 CONSTELLATION BLVD", units: ["RA58"], incNo: "026-0418", status: "ON SCENE", priority: 3 },
  { time: "20:58:13", type: "CHIM", typeCode: "CHIM", addr: "914 WESTWOOD BLVD X LE CONTE", units: ["E68","T58"], incNo: "026-0420", status: "ON SCENE", priority: 2 },
  { time: "20:42:07", type: "ALS", typeCode: "MA", addr: "2080 CENTURY PARK E FL 12", units: ["RA692","E292"], incNo: "026-0417", status: "AT HOSPITAL", priority: 1 },
  { time: "20:15:33", type: "POLE", typeCode: "POLE", addr: "OLYMPIC BLVD X BEVERLY GLEN", units: ["E43","T61"], incNo: "026-0421", status: "ON SCENE", priority: 2 },
];

const WEATHER_7DAY = [
  { day: "TUE", low: 54, high: 76, wind: 10, windDir: "W", hum: 62, precip: 0 },
  { day: "WED", low: 57, high: 80, wind: 10, windDir: "W", hum: 40, precip: 0 },
  { day: "THU", low: 65, high: 96, wind: 10, windDir: "NE", hum: 14, precip: 0 },
  { day: "FRI", low: 63, high: 98, wind: 10, windDir: "N", hum: 12, precip: 0 },
  { day: "SAT", low: 59, high: 90, wind: 10, windDir: "SW", hum: 20, precip: 0 },
  { day: "SUN", low: 60, high: 90, wind: 5, windDir: "WSW", hum: 22, precip: 0 },
  { day: "MON", low: 62, high: 93, wind: 10, windDir: "WSW", hum: 28, precip: 0 },
];

interface LAFDMessage { text: string; urgency: 0 | 1 | 2 }
const LAFD_MESSAGES: LAFDMessage[] = [
  { text: "Heat Advisory issued March 10 at 12:15PM PDT until March 11 at 9:00AM PDT by NWS Los Angeles/Oxnard CA", urgency: 1 },
  { text: "LAFD Access Window Standards: Recently, there was a need to determine the maximum height of openings for accessibility for Fire Department personnel into a building to effectively perform firefighting and rescue operations.", urgency: 0 },
  { text: "Brush clearance inspections begin April 1 — all battalion chiefs ensure compliance documentation is current.", urgency: 0 },
];

const RESPONSE_HOURLY = [
  { h: "06", ems: 2, fire: 0 }, { h: "07", ems: 4, fire: 1 }, { h: "08", ems: 6, fire: 1 }, { h: "09", ems: 8, fire: 2 }, { h: "10", ems: 7, fire: 1 }, { h: "11", ems: 9, fire: 2 }, { h: "12", ems: 11, fire: 3 }, { h: "13", ems: 10, fire: 2 }, { h: "14", ems: 12, fire: 2 }, { h: "15", ems: 14, fire: 3 }, { h: "16", ems: 13, fire: 4 }, { h: "17", ems: 16, fire: 3 }, { h: "18", ems: 18, fire: 5 }, { h: "19", ems: 15, fire: 4 }, { h: "20", ems: 13, fire: 3 }, { h: "21", ems: 11, fire: 2 }, { h: "22", ems: 8, fire: 1 },
];

const M = ({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={className} style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", letterSpacing: "0.02em", ...style }}>{children}</span>
);

const Badge = ({ children, color = C.green, pulse = false, small = false }: { children: React.ReactNode; color?: string; pulse?: boolean; small?: boolean }) => (
  <span className={`inline-flex items-center gap-1 rounded font-bold ${small ? "px-1 py-px text-[8px]" : "px-1.5 py-0.5 text-[10px]"}`} style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
    {pulse && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: color }} /><span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} /></span>}
    {children}
  </span>
);

const LiveClock = ({ large = false }: { large?: boolean }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  return (
    <div>
      <M className={`font-bold tracking-tight block ${large ? "text-5xl" : "text-3xl"}`} style={{ color: C.text }}>
        {now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Los_Angeles" })}
      </M>
      <div className={`uppercase tracking-widest mt-0.5 ${large ? "text-xs" : "text-[10px]"}`} style={{ color: C.textMuted }}>
        {now.toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Los_Angeles" }).toUpperCase()}
      </div>
    </div>
  );
};

const UnitGrid = ({ stations, label }: { stations: Station[]; label: string }) => {
  const COLS = ["STN", "T", "E", "E", "RA", "RA", "RA", "FR"];
  const getSlots = (stn: Station): (Unit | null)[] => {
    const slots: (Unit | null)[] = [null, null, null, null, null, null, null];
    const trucks = stn.units.filter(u => u.type === "T"); const engines = stn.units.filter(u => u.type === "E");
    const ras = stn.units.filter(u => u.type === "RA"); const frs = stn.units.filter(u => u.type === "FR");
    if (trucks[0]) slots[0] = trucks[0]; if (engines[0]) slots[1] = engines[0]; if (engines[1]) slots[2] = engines[1];
    if (ras[0]) slots[3] = ras[0]; if (ras[1]) slots[4] = ras[1]; if (ras[2]) slots[5] = ras[2]; if (frs[0]) slots[6] = frs[0];
    return slots;
  };
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest font-bold mb-1.5 px-1" style={{ color: C.textMuted }}>{label}</div>
      <div className="grid gap-0.5 px-1 mb-0.5" style={{ gridTemplateColumns: "36px repeat(7, 1fr)" }}>
        {COLS.map((c, i) => (<div key={i} className="text-[8px] uppercase tracking-widest font-bold text-center py-0.5" style={{ color: C.textFaint }}>{c}</div>))}
      </div>
      {stations.map(stn => {
        const slots = getSlots(stn); const hasActive = stn.units.some(u => u.status !== "AVAIL" && u.status !== "OFFDUTY");
        return (
          <div key={stn.id} className="grid gap-0.5 px-1 py-px" style={{ gridTemplateColumns: "36px repeat(7, 1fr)" }}>
            <M className="text-sm font-black flex items-center" style={{ color: hasActive ? C.amber : C.cyan }}>{stn.code}</M>
            {slots.map((unit, i) => {
              if (!unit) return <div key={i} />;
              const bg = STATUS_COLORS[unit.status];
              return (<div key={i} className="text-center rounded-sm py-1 cursor-default transition-colors" title={unit.incNo ? `Inc: ${unit.incNo}` : "Available"} style={{ background: `${bg}20`, border: `1px solid ${bg}35` }}><M className="text-[9px] font-bold block" style={{ color: bg }}>{unit.name}</M></div>);
            })}
          </div>
        );
      })}
    </div>
  );
};

const HospitalPanel = ({ compact = false }: { compact?: boolean }) => (
  <div className="space-y-1">
    <div className="text-[10px] uppercase tracking-widest font-bold px-1 mb-1" style={{ color: C.textMuted }}>Hospitals</div>
    {HOSPITALS.map((h, i) => {
      const sc = h.status === "CLOSED" ? C.red : h.status === "ED SATURATION" ? C.amber : h.status === "ALS DIVERT" ? C.orange : C.green;
      return (
        <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex-1 min-w-0"><span className={`font-bold truncate block ${compact ? "text-[10px]" : "text-xs"}`} style={{ color: h.status === "CLOSED" ? C.textFaint : C.text }}>{h.name}</span></div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge color={sc} pulse={h.status !== "CLOSED"} small={compact}>{h.status}</Badge>
            <M className={`font-bold ${compact ? "text-[10px]" : "text-xs"}`} style={{ color: h.apot > 60 ? C.red : h.apot > 30 ? C.amber : C.green }}>{h.apot}m</M>
          </div>
        </div>
      );
    })}
  </div>
);

const WeatherPanel = () => (
  <div>
    <div className="text-[10px] uppercase tracking-widest font-bold px-1 mb-2" style={{ color: C.textMuted }}>Weather</div>
    <div className="grid grid-cols-7 gap-0.5">
      {WEATHER_7DAY.map((d, i) => {
        const highAlert = d.high >= WX_ALERT.tempHigh; const lowAlert = d.low <= WX_ALERT.tempLow;
        const humAlert = d.hum <= WX_ALERT.humidityLow; const windAlert = d.wind >= WX_ALERT.wind;
        return (
          <div key={d.day} className="text-center py-2 rounded-sm" style={{ background: i === 0 ? `${C.blue}12` : C.surface, border: `1px solid ${i === 0 ? C.blue + "25" : C.border}` }}>
            <div className="text-[9px] font-bold mb-1" style={{ color: i === 0 ? C.blue : C.textMuted }}>{d.day}</div>
            <M className="text-[10px] font-bold block" style={{ color: C.textDim }}>Low</M>
            <M className="text-xs font-bold block" style={{ color: lowAlert ? C.red : C.text }}>{d.low}°</M>
            <M className="text-[10px] font-bold block mt-1" style={{ color: C.textDim }}>High</M>
            <M className="text-xs font-bold block" style={{ color: highAlert ? C.red : C.text }}>{d.high}°</M>
            <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
              <M className="text-[9px] block" style={{ color: windAlert ? C.red : C.textMuted }}>W{d.wind}</M>
              <M className="text-[9px] block" style={{ color: humAlert ? C.red : C.textMuted }}>{d.hum}%</M>
              <M className="text-[9px] block" style={{ color: d.precip >= WX_ALERT.precipHigh ? C.red : C.textMuted }}>{d.precip}%</M>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const MessageTicker = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => { const i = setInterval(() => setIdx(p => (p + 1) % LAFD_MESSAGES.length), 8000); return () => clearInterval(i); }, []);
  const msg = LAFD_MESSAGES[idx]; const urgColor = msg.urgency === 2 ? C.red : msg.urgency === 1 ? C.amber : C.green;
  return (
    <div className="flex items-center gap-3 px-3 py-2 overflow-hidden" style={{ background: `${urgColor}08`, borderTop: `1px solid ${urgColor}25` }}>
      <M className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded" style={{ background: `${urgColor}20`, color: urgColor }}>LAFD MSG {idx + 1}/{LAFD_MESSAGES.length}</M>
      <span className="text-[11px] truncate" style={{ color: C.text }}>{msg.text}</span>
    </div>
  );
};

const StationBaseDash = () => {
  const AvailabilityMap = ({ label }: { label: string }) => (
    <div className="rounded-sm overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="text-[8px] uppercase tracking-widest font-bold text-center py-1" style={{ color: C.textFaint, background: C.card }}>{label}</div>
      <div className="grid grid-cols-5 gap-px p-1" style={{ height: 100 }}>
        {Array.from({ length: 15 }).map((_, i) => { const avail = [0, 1, 2, 2, 1, 2, 2, 2, 0, 1, 2, 2, 1, 2, 2][i]; const col = avail === 0 ? C.red : avail === 1 ? C.amber : C.green; return <div key={i} className="rounded-sm" style={{ background: `${col}30`, border: `1px solid ${col}20` }} />; })}
      </div>
    </div>
  );
  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: C.bg }}>
      <div className="w-52 shrink-0 flex flex-col border-r overflow-y-auto" style={{ background: C.card, borderColor: C.border }}>
        <div className="p-3 border-b" style={{ borderColor: C.border }}>
          <LiveClock large />
          <div className="mt-2 flex items-center gap-2">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: C.green + "15", border: `2px solid ${C.green}40` }}><M className="text-3xl font-black" style={{ color: C.green }}>92</M></div>
            <div><M className="text-[10px] block" style={{ color: C.textDim }}>58°F · 62%</M><M className="text-[10px] block" style={{ color: C.textDim }}>Wind 10 W</M></div>
          </div>
        </div>
        <div className="p-3 border-b space-y-1" style={{ borderColor: C.border }}>
          <div className="text-[8px] uppercase tracking-widest font-bold" style={{ color: C.textFaint }}>Utility Status</div>
          {["GAS", "LADWP", "WATER", "SCE POWER"].map(u => (<div key={u} className="flex justify-between items-center"><M className="text-[9px]" style={{ color: C.textMuted }}>{u}</M><M className="text-[9px] font-bold" style={{ color: C.green }}>OK</M></div>))}
        </div>
        <div className="p-3 border-b space-y-1" style={{ borderColor: C.border }}>
          <div className="text-[8px] uppercase tracking-widest font-bold" style={{ color: C.textFaint }}>Freeway Status</div>
          {[{ id: "5NB", s: "OK" }, { id: "5SB", s: "OK" }, { id: "10EB", s: "OK" }, { id: "10WB", s: "OK" }, { id: "90EB", s: "OK" }, { id: "90WB", s: "OK" }, { id: "105EB", s: "OK" }, { id: "105WB", s: "OK" }, { id: "110NB", s: "OK" }, { id: "110SB", s: "OK" }, { id: "405NB", s: "SLOW", alert: true }, { id: "405SB", s: "OK" }].map((f: any) => (<div key={f.id} className="flex justify-between items-center"><M className="text-[9px]" style={{ color: C.textMuted }}>{f.id}</M><M className="text-[9px] font-bold" style={{ color: f.alert ? C.red : C.green }}>{f.s}</M></div>))}
        </div>
        <div className="p-3 flex-1"><WeatherPanel /></div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-sm p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}><UnitGrid stations={STATIONS_B18} label="Battalion 18" /></div>
            <div className="rounded-sm p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}><UnitGrid stations={STATIONS_B9} label="Battalion 9" /></div>
          </div>
          <div className="rounded-sm p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}><HospitalPanel compact /></div>
          <div className="grid grid-cols-2 gap-3"><AvailabilityMap label="RA Availability" /><AvailabilityMap label="T/E Availability" /></div>
          <div className="rounded-sm p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-widest font-bold px-1 mb-1.5" style={{ color: C.textMuted }}>Active Calls (B18)</div>
            <div className="space-y-0.5">
              {ACTIVE_CALLS.map((call, i) => { const sc = call.status === "DISPATCHED" ? C.blue : call.status === "ON SCENE" ? C.amber : call.status === "TRANSPORTING" ? C.purple : call.status === "AT HOSPITAL" ? C.red : C.green; return (
                <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-sm" style={{ background: C.surface }}>
                  <M className="text-[10px] shrink-0" style={{ color: C.textMuted }}>{call.time}</M>
                  <M className="text-[10px] font-bold px-1 rounded-sm shrink-0" style={{ background: `${call.type === "ALS" ? C.red : call.type === "STR" ? C.amber : C.blue}20`, color: call.type === "ALS" ? C.red : call.type === "STR" ? C.amber : C.blue }}>{call.type}</M>
                  <M className="text-[10px] flex-1 truncate" style={{ color: C.text }}>{call.addr}</M>
                  <M className="text-[10px] shrink-0" style={{ color: C.cyan }}>{call.units.join(", ")}</M>
                  <Badge color={sc} small pulse={call.status !== "COMPLETED"}>{call.status}</Badge>
                </div>); })}
            </div>
          </div>
        </div>
        <MessageTicker />
      </div>
    </div>
  );
};

const IncidentDash = () => {
  const [tab, setTab] = useState<"INC" | "STREET" | "FOLLOW" | "HYDRANTS" | "APOT" | "CALLS">("INC");
  const TABS: { id: typeof tab; label: string }[] = [{ id: "INC", label: "Incident Map" }, { id: "STREET", label: "Street/Traffic" }, { id: "FOLLOW", label: "Follow" }, { id: "HYDRANTS", label: "Show Hydrants" }, { id: "APOT", label: "APOT" }, { id: "CALLS", label: "Calls" }];
  const APOTDestination = () => (
    <div className="space-y-3 p-3">
      <div className="text-xs uppercase tracking-widest font-bold" style={{ color: C.textMuted }}>Hospital Destination — Ambulance Patient Offload</div>
      <div className="flex gap-2 mb-2">{[{ l: "A", c: "ALPHA", bg: C.green }, { l: "B", c: "BRAVO", bg: C.blue }, { l: "C", c: "CHARLIE", bg: C.amber }, { l: "D", c: "DELTA", bg: C.orange }, { l: "E", c: "ECHO", bg: C.red }].map(s => (<div key={s.l} className="flex items-center gap-1 px-2 py-1 rounded-sm" style={{ background: `${s.bg}15`, border: `1px solid ${s.bg}30` }}><M className="text-sm font-black" style={{ color: s.bg }}>{s.l}</M><M className="text-[8px]" style={{ color: C.textMuted }}>{s.c}</M></div>))}</div>
      {HOSPITALS.filter(h => h.status !== "CLOSED").map((h, i) => { const apotC = h.apot <= 15 ? C.green : h.apot <= 30 ? C.blue : h.apot <= 45 ? C.amber : h.apot <= 60 ? C.orange : C.red; return (
        <div key={i} className="rounded-sm p-3" style={{ background: C.card, borderLeft: `3px solid ${apotC}`, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-2"><div><span className="text-sm font-bold" style={{ color: C.text }}>{h.code}</span><M className="text-[10px] block" style={{ color: C.textMuted }}>{h.name}</M></div><div className="flex items-center gap-2"><Badge color={apotC}>{h.apot <= 15 ? "ALPHA" : h.apot <= 30 ? "BRAVO" : h.apot <= 45 ? "CHARLIE" : h.apot <= 60 ? "DELTA" : "ECHO"}</Badge><Badge color={h.status === "ED SATURATION" ? C.amber : C.green} pulse>{h.status}</Badge></div></div>
          <div className="grid grid-cols-5 gap-2">{[{ l: "WAIT", v: `${h.apot}m`, c: apotC }, { l: "DIST", v: `${h.dist}mi`, c: C.textDim }, { l: "TRAVEL", v: `${h.travel}m`, c: C.textDim }, { l: "AT FAC", v: String(h.atFac), c: h.atFac > 0 ? C.amber : C.green }, { l: "EN RTE", v: String(h.enRoute), c: h.enRoute > 0 ? C.blue : C.textDim }].map(d => (<div key={d.l} className="text-center py-1 rounded-sm" style={{ background: C.surface }}><M className="text-sm font-bold block" style={{ color: d.c }}>{d.v}</M><div className="text-[7px] uppercase tracking-widest" style={{ color: C.textFaint }}>{d.l}</div></div>))}</div>
        </div>); })}
    </div>
  );
  const TacticalMap = () => (
    <div className="relative h-full" style={{ background: "linear-gradient(135deg, #0a1018 0%, #0f1722 100%)" }}>
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.08 }}>{Array.from({ length: 30 }).map((_, i) => (<line key={`h${i}`} x1="0" y1={i * 20} x2="100%" y2={i * 20} stroke={C.textFaint} strokeWidth="0.5" />))}{Array.from({ length: 50 }).map((_, i) => (<line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="100%" stroke={C.textFaint} strokeWidth="0.5" />))}</svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><div className="w-40 h-40 rounded-full animate-pulse" style={{ background: `radial-gradient(circle, ${C.red}15 0%, transparent 70%)`, border: `1px solid ${C.red}25` }} /><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full" style={{ background: C.red, boxShadow: `0 0 12px ${C.red}80` }} /></div>
      {[{ id: "T92", x: "40%", y: "45%", color: C.amber }, { id: "E292", x: "55%", y: "42%", color: C.amber }, { id: "E492", x: "60%", y: "55%", color: C.cyan }, { id: "RA92", x: "35%", y: "60%", color: C.blue }].map(u => (<div key={u.id} className="absolute flex items-center gap-1" style={{ left: u.x, top: u.y }}><div className="w-2.5 h-2.5 rounded-full" style={{ background: u.color, boxShadow: `0 0 6px ${u.color}60` }} /><M className="text-[8px] font-bold px-1 rounded-sm" style={{ background: `${C.card}ee`, color: u.color, border: `1px solid ${u.color}30` }}>{u.id}</M></div>))}
      <div className="absolute top-3 left-3 rounded-sm px-3 py-2" style={{ background: `${C.card}ee`, border: `1px solid ${C.red}30` }}><M className="text-[10px] font-bold block" style={{ color: C.red }}>INC 026-0422 — STR</M><M className="text-[10px] block" style={{ color: C.text }}>1800 CENTURY PARK E</M><M className="text-[9px] block" style={{ color: C.textMuted }}>CH 14 · Dispatched 21:47 · Units: 4</M></div>
    </div>
  );
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: C.bg }}>
      <div className="flex shrink-0" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => (<button key={t.id} onClick={() => setTab(t.id)} className="px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold transition-colors cursor-pointer" style={{ background: tab === t.id ? C.red : "transparent", color: tab === t.id ? "white" : C.textMuted, borderRight: `1px solid ${C.border}` }}>{t.label}</button>))}
        <div className="flex-1" /><button className="px-3 py-2 text-[10px] uppercase tracking-widest font-bold cursor-pointer" style={{ color: C.textMuted, borderLeft: `1px solid ${C.border}` }}>Re-Center</button>
      </div>
      <div className="flex-1 overflow-auto">
        {tab === "INC" && <TacticalMap />}
        {tab === "STREET" && (<div className="relative h-full" style={{ background: "#e8e4d8" }}><div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><M className="text-lg font-bold block" style={{ color: "#333" }}>Street / Traffic View</M><M className="text-sm block mt-1" style={{ color: "#666" }}>Route from Station 92 to incident</M></div></div></div>)}
        {tab === "FOLLOW" && (<div className="relative h-full" style={{ background: "#1a1a2e" }}><div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><Compass size={48} style={{ color: C.cyan, margin: "0 auto" }} /><M className="text-lg font-bold block mt-3" style={{ color: C.text }}>Follow Mode</M><M className="text-xs block mt-1" style={{ color: C.textMuted }}>GPS tracking with heading rotation</M></div></div></div>)}
        {tab === "HYDRANTS" && <TacticalMap />}
        {tab === "APOT" && <APOTDestination />}
        {tab === "CALLS" && (<div className="p-3 space-y-3"><UnitGrid stations={STATIONS_B18} label="Battalion 18 — Live Unit Status" /><div className="rounded-sm p-2 mt-3" style={{ background: C.card, border: `1px solid ${C.border}` }}><div className="text-[10px] uppercase tracking-widest font-bold px-1 mb-1.5" style={{ color: C.textMuted }}>Active Calls</div>{ACTIVE_CALLS.map((call, i) => { const sc = call.status === "DISPATCHED" ? C.blue : call.status === "ON SCENE" ? C.amber : call.status === "TRANSPORTING" ? C.purple : call.status === "AT HOSPITAL" ? C.red : C.green; return (<div key={i} className="flex items-center gap-2 px-2 py-1 rounded-sm mb-0.5" style={{ background: C.surface }}><M className="text-[10px]" style={{ color: C.textMuted }}>{call.time}</M><Badge color={call.type === "ALS" ? C.red : C.amber} small>{call.type}</Badge><M className="text-[10px] flex-1 truncate" style={{ color: C.text }}>{call.addr}</M><M className="text-[10px]" style={{ color: C.cyan }}>{call.units.join(",")}</M><Badge color={sc} small pulse>{call.status}</Badge></div>); })}</div></div>)}
      </div>
    </div>
  );
};

const BureauDash = () => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: C.bg }}>
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-4">{["CENTRAL", "SOUTH", "VALLEY", "WEST"].map((b, i) => (<button key={b} className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-sm cursor-pointer" style={{ background: i === 0 ? C.green + "20" : "transparent", color: i === 0 ? C.green : C.textMuted, border: `1px solid ${i === 0 ? C.green + "30" : "transparent"}` }}>{b}</button>))}</div>
        <div className="flex items-center gap-4"><M className="text-[10px]" style={{ color: C.textMuted }}>Active: <span style={{ color: C.red }}>17</span></M><M className="text-[10px]" style={{ color: C.textMuted }}>EMS 24h: <span style={{ color: C.cyan }}>242</span></M><M className="text-[10px]" style={{ color: C.textMuted }}>Fire 24h: <span style={{ color: C.amber }}>41</span></M><LiveClock /></div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-5 rounded-sm p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}><UnitGrid stations={STATIONS_B18} label="Battalion 18" /></div>
          <div className="col-span-4 rounded-sm p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}><UnitGrid stations={STATIONS_B9} label="Battalion 9" /></div>
          <div className="col-span-3 space-y-3"><div className="rounded-sm p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}><HospitalPanel compact /></div><div className="rounded-sm p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}><WeatherPanel /></div></div>
          <div className="col-span-6 rounded-sm p-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: C.textMuted }}>Bureau Activity — Last 24h</div>
            <div style={{ height: 160 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={RESPONSE_HOURLY}><defs><linearGradient id="eG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.cyan} stopOpacity={0.25} /><stop offset="95%" stopColor={C.cyan} stopOpacity={0} /></linearGradient><linearGradient id="fG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.amber} stopOpacity={0.25} /><stop offset="95%" stopColor={C.amber} stopOpacity={0} /></linearGradient></defs><XAxis dataKey="h" tick={{ fill: C.textFaint, fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 10, fontFamily: "monospace" }} /><Area type="monotone" dataKey="ems" stroke={C.cyan} fill="url(#eG)" strokeWidth={1.5} name="EMS" /><Area type="monotone" dataKey="fire" stroke={C.amber} fill="url(#fG)" strokeWidth={1.5} name="Fire" /></AreaChart></ResponsiveContainer></div>
          </div>
          <div className="col-span-6 rounded-sm p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-widest font-bold px-1 mb-1.5" style={{ color: C.textMuted }}>Active Calls — All Battalions</div>
            <div className="space-y-0.5">{ACTIVE_CALLS.map((call, i) => { const sc = call.status === "DISPATCHED" ? C.blue : call.status === "ON SCENE" ? C.amber : call.status === "TRANSPORTING" ? C.purple : call.status === "AT HOSPITAL" ? C.red : C.green; return (<div key={i} className="flex items-center gap-2 px-2 py-1 rounded-sm" style={{ background: C.surface }}><M className="text-[10px]" style={{ color: C.textMuted }}>{call.time}</M><Badge color={call.type === "ALS" ? C.red : C.amber} small>{call.type}</Badge><M className="text-[10px] flex-1 truncate" style={{ color: C.text }}>{call.addr}</M><M className="text-[10px]" style={{ color: C.cyan }}>{call.units.join(",")}</M><Badge color={sc} small pulse>{call.status}</Badge></div>); })}</div>
          </div>
        </div>
      </div>
      <MessageTicker />
    </div>
  );
};

type ViewId = "station" | "incident" | "bureau" | "apot";
const NAV: { id: ViewId; label: string; icon: LucideIcon }[] = [{ id: "station", label: "Station", icon: Building2 }, { id: "incident", label: "Incident", icon: Target }, { id: "bureau", label: "Bureau", icon: Layers }, { id: "apot", label: "APOT", icon: Timer }];

const APOTDash = () => {
  const APOT_WEEKLY = [{ day: "Mon", avg: 28, p90: 42 }, { day: "Tue", avg: 31, p90: 48 }, { day: "Wed", avg: 26, p90: 38 }, { day: "Thu", avg: 33, p90: 52 }, { day: "Fri", avg: 35, p90: 55 }, { day: "Sat", avg: 29, p90: 44 }, { day: "Sun", avg: 24, p90: 36 }];
  return (
    <div className="flex-1 overflow-auto p-4 space-y-3" style={{ background: C.bg }}>
      <div className="rounded-sm p-4 flex items-center gap-6" style={{ background: `${C.red}06`, border: `1px solid ${C.red}20` }}>
        <div className="flex items-center gap-3"><div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${C.red}15`, border: `2px solid ${C.red}50` }}><M className="text-xl font-black" style={{ color: C.red }}>33m</M></div><div><div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: C.red }}>7-Day Avg APOT</div><div className="text-[9px]" style={{ color: C.textMuted }}>AB-40 Standard: 30 min @ 90th pctl</div></div></div>
        <div className="h-8 w-px" style={{ background: C.border }} />
        <div className="grid grid-cols-4 gap-6 flex-1">{[{ l: "90th Pctl", v: "48m", c: C.amber }, { l: "Daily Encounters", v: "46", c: C.text }, { l: "ALS / BLS", v: "48% / 52%", c: C.cyan }, { l: "Compliance", v: "78%", c: C.red }].map(s => (<div key={s.l}><M className="text-lg font-bold" style={{ color: s.c }}>{s.v}</M><div className="text-[9px]" style={{ color: C.textMuted }}>{s.l}</div></div>))}</div>
      </div>
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-7 space-y-2">{HOSPITALS.filter(h => h.status !== "CLOSED").map((h, i) => { const ac = h.apot <= 15 ? C.green : h.apot <= 30 ? C.blue : h.apot <= 45 ? C.amber : h.apot <= 60 ? C.orange : C.red; const ab40 = h.apot <= 30; return (<div key={i} className="rounded-sm p-3 flex items-center gap-4" style={{ background: C.card, borderLeft: `3px solid ${ac}`, border: `1px solid ${C.border}` }}><div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ background: `${ac}15` }}><M className="text-sm font-black" style={{ color: ac }}>{h.apot}m</M></div><div className="flex-1 min-w-0"><span className="text-xs font-bold" style={{ color: C.text }}>{h.code}</span><M className="text-[9px] block" style={{ color: C.textMuted }}>{h.dist}mi · {h.travel}m travel · {h.atFac} at fac · {h.enRoute} en rte</M></div><div className="flex items-center gap-2 shrink-0"><Badge color={h.status === "ED SATURATION" ? C.amber : C.green} pulse small>{h.status}</Badge><Badge color={ab40 ? C.green : C.red} small>{ab40 ? "AB-40 ✓" : "AB-40 ✗"}</Badge></div></div>); })}</div>
        <div className="col-span-5 space-y-3">
          <div className="rounded-sm p-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: C.textMuted }}>APOT Weekly Trend</div>
            <div style={{ height: 160 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={APOT_WEEKLY} barGap={2}><XAxis dataKey="day" tick={{ fill: C.textFaint, fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: C.textFaint, fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 10, fontFamily: "monospace" }} /><Bar dataKey="avg" fill={C.cyan} radius={[2, 2, 0, 0]} name="Avg APOT" /><Bar dataKey="p90" fill={C.amber} radius={[2, 2, 0, 0]} name="90th %" /></BarChart></ResponsiveContainer></div>
            <div className="flex items-center gap-2 mt-1 px-1"><div className="h-px flex-1" style={{ background: `${C.red}40` }} /><M className="text-[8px] font-bold" style={{ color: C.red }}>AB-40: 30 MIN</M><div className="h-px flex-1" style={{ background: `${C.red}40` }} /></div>
          </div>
          <div className="rounded-sm p-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: C.textMuted }}>Exceedances Today</div>
            {[{ hosp: "UCLA RR", unit: "RA92", dur: "89m 45s", t: "15:21" }, { hosp: "CEDARS MCTR", unit: "RA34", dur: "52m 12s", t: "14:08" }, { hosp: "UCLA SM", unit: "RA58", dur: "67m 04s", t: "18:33" }].map((e, i) => (<div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-sm mb-1" style={{ background: `${C.red}06`, border: `1px solid ${C.red}15` }}><div className="flex items-center gap-2"><M className="text-[10px] font-bold" style={{ color: C.red }}>{e.dur}</M><M className="text-[10px]" style={{ color: C.text }}>{e.hosp}</M><M className="text-[9px]" style={{ color: C.textMuted }}>{e.unit} · {e.t}</M></div><Badge color={C.red} small>EXCEED</Badge></div>))}
          </div>
          <div className="rounded-sm p-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: C.textMuted }}>Peak Wait Windows</div>
            {[{ t: "5-9 PM", l: "PEAK", pct: 85, c: C.red }, { t: "12-5 PM", l: "HIGH", pct: 65, c: C.amber }, { t: "9 PM-12 AM", l: "MOD", pct: 45, c: C.blue }, { t: "6 AM-12 PM", l: "LOW", pct: 30, c: C.green }].map(p => (<div key={p.t} className="flex items-center gap-2 mb-1"><M className="text-[9px] w-20 shrink-0" style={{ color: C.textDim }}>{p.t}</M><div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: C.surface }}><div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.c }} /></div><M className="text-[8px] font-bold w-8" style={{ color: p.c }}>{p.l}</M></div>))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<ViewId>("station");
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden" style={{ background: C.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: C.red }}>
        <div className="flex items-center gap-3"><Shield size={16} className="text-white" /><span className="text-white font-black text-sm tracking-widest">FIREDASH</span><span className="text-white/40 text-xs">|</span><M className="text-white/80 text-xs">STN 92 — 10400 OLYMPIC BLVD X BEVERLY GLEN</M></div>
        <div className="flex items-center gap-3"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" /></span><M className="text-[10px] text-white/70 uppercase tracking-wider">System Nominal</M><M className="text-[10px] text-white/50">v2.0.0</M></div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {view === "station" && <StationBaseDash />}{view === "incident" && <IncidentDash />}{view === "bureau" && <BureauDash />}{view === "apot" && <APOTDash />}
        <div className="w-14 shrink-0 flex flex-col items-center py-2 gap-1" style={{ background: C.surface, borderLeft: `1px solid ${C.border}` }}>
          {NAV.map(n => (<button key={n.id} onClick={() => setView(n.id)} className="w-12 h-12 rounded flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer" style={{ background: view === n.id ? `${C.red}15` : "transparent", border: `1px solid ${view === n.id ? C.red + "40" : "transparent"}`, color: view === n.id ? C.red : C.textFaint }}><n.icon size={16} /><span className="text-[7px] uppercase tracking-wider font-bold">{n.label}</span></button>))}
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-1 shrink-0" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
        <M className="text-[9px]" style={{ color: C.green }}>● FIREDASH v2.0.0</M>
        <div className="flex items-center gap-3"><M className="text-[9px]" style={{ color: C.textFaint }}>Poll: 5s</M><M className="text-[9px]" style={{ color: C.textFaint }}>B18 Connected</M><M className="text-[9px]" style={{ color: C.textFaint }}>CAD Feed ●</M><M className="text-[9px] font-bold" style={{ color: C.textMuted }}>APOT Solutions, Inc.</M></div>
      </div>
    </div>
  );
}
