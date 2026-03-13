import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────────────
export interface Unit { id: string; status: string; }
export interface Incident { id: string; type: string; time: string; addr: string; lat: string; lng: string; agency: string; units: Unit[]; }
export type IncidentCategory = "ems" | "fire" | "tc" | "hazmat" | "rescue" | "other";
export interface BureauCounts { [key: string]: number; }
export interface PulsePointData { incidents: Incident[]; total: number; bureaus: BureauCounts; live: boolean; lastFetch: string; history: number[]; }

// ─── RA Fleet Data ──────────────────────────────────────────────────
export interface RAUnit { id: string; level: "ALS" | "BLS"; station: number; }

export const RA_FLEET: RAUnit[] = [
  {id:"RA19",level:"ALS",station:19},{id:"RA826",level:"BLS",station:26},{id:"RA898",level:"BLS",station:98},
  {id:"RA858",level:"BLS",station:58},{id:"RA850",level:"BLS",station:50},{id:"RA83",level:"ALS",station:83},
  {id:"RA2",level:"ALS",station:2},{id:"RA94",level:"ALS",station:94},{id:"RA246",level:"ALS",station:46},
  {id:"RA25",level:"ALS",station:25},{id:"RA809",level:"BLS",station:9},{id:"RA70",level:"ALS",station:70},
  {id:"RA3",level:"ALS",station:3},{id:"RA89",level:"ALS",station:89},{id:"RA804",level:"BLS",station:4},
  {id:"RA6",level:"ALS",station:6},{id:"RA96",level:"ALS",station:96},{id:"RA211",level:"ALS",station:11},
  {id:"RA881",level:"BLS",station:81},{id:"RA68",level:"ALS",station:68},{id:"RA9",level:"ALS",station:9},
  {id:"RA84",level:"ALS",station:84},{id:"RA87",level:"ALS",station:87},{id:"RA76",level:"ALS",station:76},
  {id:"RA833",level:"BLS",station:33},{id:"RA903",level:"BLS",station:103},{id:"RA257",level:"ALS",station:57},
  {id:"RA41",level:"ALS",station:41},{id:"RA864",level:"BLS",station:64},{id:"RA39",level:"ALS",station:39},
  {id:"RA72",level:"ALS",station:72},{id:"RA91",level:"ALS",station:91},{id:"RA37",level:"ALS",station:37},
  {id:"RA11",level:"ALS",station:11},{id:"RA88",level:"ALS",station:88},{id:"RA13",level:"ALS",station:13},
  {id:"RA106",level:"ALS",station:106},{id:"RA98",level:"ALS",station:98},{id:"RA12",level:"ALS",station:12},
  {id:"RA815",level:"BLS",station:15},{id:"RA105",level:"ALS",station:105},{id:"RA101",level:"ALS",station:101},
  {id:"RA102",level:"ALS",station:102},{id:"RA892",level:"BLS",station:92},{id:"RA63",level:"BLS",station:63},
  {id:"RA1",level:"ALS",station:1},{id:"RA894",level:"BLS",station:94},{id:"RA10",level:"ALS",station:10},
  {id:"RA69",level:"ALS",station:69},{id:"RA26",level:"ALS",station:26},{id:"RA60",level:"ALS",station:60},
  {id:"RA862",level:"BLS",station:62},{id:"RA71",level:"ALS",station:71},{id:"RA867",level:"BLS",station:67},
  {id:"RA78",level:"ALS",station:78},{id:"RA97",level:"ALS",station:97},{id:"RA56",level:"ALS",station:56},
  {id:"RA35",level:"ALS",station:35},{id:"RA58",level:"ALS",station:58},{id:"RA93",level:"ALS",station:93},
  {id:"RA73",level:"ALS",station:73},{id:"RA59",level:"ALS",station:59},{id:"RA810",level:"BLS",station:10},
  {id:"RA92",level:"ALS",station:92},{id:"RA5",level:"ALS",station:5},{id:"RA835",level:"BLS",station:35},
  {id:"RA52",level:"ALS",station:52},{id:"RA77",level:"ALS",station:77},{id:"RA47",level:"ALS",station:47},
  {id:"RA878",level:"BLS",station:78},{id:"RA104",level:"ALS",station:104},{id:"RA814",level:"BLS",station:14},
  {id:"RA66",level:"ALS",station:66},{id:"RA90",level:"ALS",station:90},{id:"RA896",level:"BLS",station:96},
  {id:"RA861",level:"BLS",station:61},{id:"RA807",level:"BLS",station:7},{id:"RA61",level:"ALS",station:61},
  {id:"RA848",level:"BLS",station:48},{id:"RA829",level:"BLS",station:29},{id:"RA865",level:"BLS",station:65},
  {id:"RA14",level:"ALS",station:14},{id:"RA33",level:"ALS",station:33},{id:"RA889",level:"BLS",station:89},
  {id:"RA38",level:"ALS",station:38},{id:"RA15",level:"ALS",station:15},{id:"RA866",level:"BLS",station:66},
  {id:"RA813",level:"BLS",station:13},{id:"RA79",level:"ALS",station:79},{id:"RA18",level:"ALS",station:18},
  {id:"RA55",level:"ALS",station:55},{id:"RA85",level:"ALS",station:85},{id:"RA46",level:"ALS",station:46},
  {id:"RA803",level:"BLS",station:3},{id:"RA801",level:"BLS",station:1},{id:"RA837",level:"BLS",station:37},
  {id:"RA872",level:"ALS",station:72},{id:"RA95",level:"ALS",station:95},{id:"RA874",level:"BLS",station:74},
  {id:"RA834",level:"BLS",station:34},
];

export const RA_FLEET_STATS = {
  total: RA_FLEET.length,
  als: RA_FLEET.filter(r => r.level === "ALS").length,
  bls: RA_FLEET.filter(r => r.level === "BLS").length,
};

// ─── Hospital Simulation (WallTime Integration) ─────────────────────
export interface Hospital {
  name: string; short: string; status: "OPEN" | "ED SATURATION" | "DIVERT" | "CLOSED";
  wait: number; dist: number; atHospital: number; enRoute: number;
  designations: string[]; beds: number;
}

const HOSPITAL_NAMES = [
  { name: "Cedars-Sinai Medical Center", short: "CEDARS MDR", dist: 3.2, beds: 886, designations: ["EDAP","SRC","STEMI","TRAUMA"] },
  { name: "UCLA Ronald Reagan", short: "UCLA RR", dist: 2.6, beds: 520, designations: ["CSC","EDAP","LPS","NICU","PMC","SRC","TC"] },
  { name: "UCLA Santa Monica", short: "UCLA SM", dist: 5.0, beds: 265, designations: ["EDAP","NICU","PSC","SRC","TSC"] },
  { name: "Kaiser West LA", short: "KAISER WLA", dist: 5.1, beds: 420, designations: ["EDAP","LPS","PSC","SRC"] },
  { name: "Kaiser Sunset", short: "KAISER SUN", dist: 6.8, beds: 352, designations: ["EDAP","LPS","PSC"] },
  { name: "West LA VA", short: "WEST LA VA", dist: 2.2, beds: 296, designations: [] },
  { name: "Sherman Oaks Hospital", short: "SHERMAN OAK", dist: 11.4, beds: 153, designations: ["EDAP","LPS"] },
  { name: "Providence St John's", short: "ST JOHNS", dist: 7.1, beds: 213, designations: ["EDAP","SRC","PSC"] },
];

function generateHospitalData(): Hospital[] {
  const statuses: Hospital["status"][] = ["OPEN", "OPEN", "OPEN", "ED SATURATION", "OPEN", "CLOSED", "OPEN", "OPEN"];
  return HOSPITAL_NAMES.map((h, i) => ({
    ...h,
    status: statuses[i],
    wait: Math.floor(Math.random() * 80 + 10),
    atHospital: Math.floor(Math.random() * 4),
    enRoute: Math.floor(Math.random() * 3),
  }));
}

export function useHospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>(generateHospitalData);
  useEffect(() => {
    const i = setInterval(() => {
      setHospitals(prev => prev.map(h => ({
        ...h,
        wait: Math.max(5, h.wait + Math.floor(Math.random() * 11 - 5)),
        atHospital: Math.max(0, h.atHospital + (Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0)),
        enRoute: Math.max(0, h.enRoute + (Math.random() > 0.85 ? (Math.random() > 0.5 ? 1 : -1) : 0)),
      })));
    }, 15000);
    return () => clearInterval(i);
  }, []);
  return hospitals;
}

// ─── Simulated RA Transports (WallTime Data) ────────────────────────
export interface RATransport {
  unit: string; level: "ALS" | "BLS"; station: number;
  hospital: string; wallTime: number; status: "EN ROUTE" | "AT HOSPITAL" | "AVAILABLE";
  chief: string;
}

const COMPLAINTS = ["CHEST PAIN","DYSPNEA","FALL","SYNCOPE","ABD PAIN","ALTERED MS","SEIZURE","ALLERGIC RXN","BACK PAIN","HEADACHE","DIABETIC","OD","LACERATION","ASSAULT","PSYCH"];

function generateTransports(): RATransport[] {
  const count = Math.floor(Math.random() * 8 + 6);
  const shuffled = [...RA_FLEET].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map(ra => {
    const hosp = HOSPITAL_NAMES[Math.floor(Math.random() * HOSPITAL_NAMES.length)];
    const status = Math.random() > 0.4 ? "AT HOSPITAL" : Math.random() > 0.3 ? "EN ROUTE" : "AVAILABLE";
    return {
      unit: ra.id, level: ra.level, station: ra.station,
      hospital: hosp.short,
      wallTime: status === "AT HOSPITAL" ? Math.floor(Math.random() * 90 + 5) : 0,
      status,
      chief: COMPLAINTS[Math.floor(Math.random() * COMPLAINTS.length)],
    };
  });
}

export function useTransports() {
  const [transports, setTransports] = useState<RATransport[]>(generateTransports);
  useEffect(() => {
    const i = setInterval(() => {
      setTransports(prev => prev.map(t => ({
        ...t,
        wallTime: t.status === "AT HOSPITAL" ? t.wallTime + Math.floor(Math.random() * 3) : 0,
        status: Math.random() > 0.95
          ? (t.status === "EN ROUTE" ? "AT HOSPITAL" : t.status === "AT HOSPITAL" ? "AVAILABLE" : "EN ROUTE")
          : t.status,
      })));
    }, 10000);
    // Refresh full list every 2 min
    const j = setInterval(() => setTransports(generateTransports()), 120000);
    return () => { clearInterval(i); clearInterval(j); };
  }, []);
  return transports;
}

// ─── Weather (Open-Meteo — free, no key) ────────────────────────────
export interface Weather {
  temp: number; humidity: number; wind: number; windDir: string;
  precip: number; condition: string; high: number; low: number;
}

export function useWeather() {
  const [weather, setWeather] = useState<Weather>({ temp: 74, humidity: 26, wind: 10, windDir: "W", precip: 0, condition: "Clear", high: 93, low: 65 });
  useEffect(() => {
    async function fetchWeather() {
      try {
        const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=34.0522&longitude=-118.2437&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Los_Angeles&forecast_days=1");
        const d = await r.json();
        if (d.current) {
          const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
          const dirIdx = Math.round(d.current.wind_direction_10m / 22.5) % 16;
          setWeather({
            temp: Math.round(d.current.temperature_2m),
            humidity: d.current.relative_humidity_2m,
            wind: Math.round(d.current.wind_speed_10m),
            windDir: dirs[dirIdx],
            precip: d.current.precipitation,
            condition: d.current.precipitation > 0 ? "Rain" : "Clear",
            high: Math.round(d.daily?.temperature_2m_max?.[0] || 90),
            low: Math.round(d.daily?.temperature_2m_min?.[0] || 65),
          });
        }
      } catch { /* use defaults */ }
    }
    fetchWeather();
    const i = setInterval(fetchWeather, 600000); // 10 min
    return () => clearInterval(i);
  }, []);
  return weather;
}

// ─── Constants ──────────────────────────────────────────────────────
export const TYPE_LABELS: Record<string, string> = {
  ME:"MEDICAL EMERGENCY",MA:"FIRE ALARM",MCI:"MASS CASUALTY",SF:"STRUCTURE FIRE",RF:"RESIDENTIAL FIRE",CF:"COMMERCIAL FIRE",WSF:"WORKING STRUCTURE",WRF:"WORKING RESIDENTIAL",WCF:"WORKING COMMERCIAL",FULL:"FULL ASSIGNMENT",VF:"VEHICLE FIRE",VEG:"VEGETATION FIRE",WVEG:"WORKING VEGETATION",TC:"TRAFFIC COLLISION",TCE:"EXTRICATION TC",FA:"FIRE ALARM",GAS:"GAS LEAK",EE:"ELECTRICAL EMERGENCY",HMR:"HAZMAT RESPONSE",EX:"EXPLOSION",CHIM:"CHIMNEY FIRE",OF:"OUTSIDE FIRE",FIRE:"FIRE",AF:"APPLIANCE FIRE",PF:"POLE FIRE",ELF:"ELECTRICAL FIRE",WR:"WATER RESCUE",RES:"RESCUE",TR:"TECHNICAL RESCUE",ELR:"ELEVATOR RESCUE",LA:"LIFT ASSIST",SI:"SMOKE INVESTIGATION",OI:"ODOR INVESTIGATION",INV:"INVESTIGATION",WD:"WIRES DOWN",WA:"WIRES ARCING",TD:"TREE DOWN",HC:"HAZARDOUS CONDITION",PS:"PUBLIC SERVICE",PA:"POLICE ASSIST",AED:"AED ALARM",FL:"FLOODING",IFT:"INTERFACILITY TRANSFER",AR:"ANIMAL RESCUE",CR:"CLIFF RESCUE",CSR:"CONFINED SPACE",USAR:"USAR",RR:"ROPE RESCUE",
};

export const TYPE_SHORT: Record<string, string> = {
  ME:"EMS",MA:"FA",MCI:"MCI",SF:"STR",RF:"STR",CF:"STR",WSF:"WSTR",WRF:"WSTR",WCF:"WSTR",FULL:"FULL",VF:"VEH",VEG:"VEG",WVEG:"WVEG",TC:"TC",TCE:"TCX",FA:"FA",GAS:"GAS",EE:"ELEC",HMR:"HAZ",EX:"EXPL",OF:"FIRE",FIRE:"FIRE",AF:"FIRE",WR:"H2O",RES:"RES",TR:"TECH",ELR:"ELEV",LA:"LIFT",SI:"INV",OI:"INV",INV:"INV",WD:"WIRE",TD:"TREE",HC:"HAZ",PS:"PS",PA:"PA",IFT:"IFT",FL:"FLOOD",
};

export const STATUS_LABELS: Record<string, string> = { Dispatched:"DISPATCHED",Enroute:"EN ROUTE",OnScene:"ON SCENE",Transport:"TRANSPORT",TransportArrived:"AT HOSPITAL",Available:"AVAILABLE",Cleared:"CLEARED",AtHospital:"AT HOSPITAL" };
export const STATUS_COLORS: Record<string, string> = { Dispatched:"#FFB020",Enroute:"#2D7FF9",OnScene:"#FF3B5C",Transport:"#A855F7",TransportArrived:"#00D4FF",Available:"#00E08E",Cleared:"#4A5568",AtHospital:"#00D4FF" };
export const BUREAU_NAMES: Record<string, string> = { LAFDC:"CENTRAL",LAFDS:"SOUTH",LAFDV:"VALLEY",LAFDW:"WEST" };

export const CATEGORY_COLORS: Record<IncidentCategory, string> = { ems:"#FF6B35",fire:"#FF3B5C",tc:"#FFB020",hazmat:"#A855F7",rescue:"#00D4FF",other:"#4A5568" };
export const CATEGORY_LABELS: Record<IncidentCategory, string> = { ems:"EMS",fire:"FIRE",tc:"TC",hazmat:"HAZMAT",rescue:"RESCUE",other:"OTHER" };

const EMS_TYPES = new Set(["ME","MA","AED","MCI","IFT"]);
const FIRE_TYPES = new Set(["SF","RF","CF","WSF","WRF","WCF","FULL","AF","CHIM","ELF","PF","FIRE","OF","VF","GF","IF","EF","MF","CB","VEG","WVEG"]);
const TC_TYPES = new Set(["TC","TCE","TCS","TCT"]);
const HAZMAT_TYPES = new Set(["HMR","GAS","EX","HMI","PE","HC"]);
const RESCUE_TYPES = new Set(["WR","RES","TR","ELR","AR","CR","CSR","TNR","USAR","VS","RR","RTE","LO","CL","RL","VL"]);

export function getCategory(type: string): IncidentCategory {
  if (EMS_TYPES.has(type)) return "ems";
  if (FIRE_TYPES.has(type)) return "fire";
  if (TC_TYPES.has(type)) return "tc";
  if (HAZMAT_TYPES.has(type)) return "hazmat";
  if (RESCUE_TYPES.has(type)) return "rescue";
  return "other";
}

export function getMostActiveStatus(units: Unit[]): string {
  const s = units.map(u => u.status);
  if (s.includes("OnScene")) return "OnScene";
  if (s.includes("Enroute")) return "Enroute";
  if (s.includes("Transport")) return "Transport";
  if (s.includes("Dispatched")) return "Dispatched";
  if (s.includes("TransportArrived")) return "TransportArrived";
  return s[0] || "Unknown";
}

export function getUnitType(id: string): string {
  if (id.startsWith("RA")) return "RESCUE AMBULANCE";
  if (id.startsWith("EM")) return "EMS CAPTAIN";
  if (id.startsWith("BC")) return "BATTALION CHIEF";
  if (id.startsWith("CM")) return "COMMAND";
  if (id.startsWith("HR")) return "HEAVY RESCUE";
  if (id.startsWith("UR")) return "USAR";
  if (id.startsWith("H") && id.length <= 3) return "HELICOPTER";
  if (id.startsWith("T") && !id.startsWith("TK")) return "TRUCK";
  if (id.startsWith("E")) return "ENGINE";
  if (id.startsWith("SQ")) return "SQUAD";
  return "UNIT";
}

export function formatTime(t: string): string { return t ? t.substring(11, 16) : "--:--"; }
export function formatAddress(a: string): string { return (a || "").split(",")[0].toUpperCase(); }
export function elapsedMinutes(t: string): number { if (!t) return 0; return Math.max(0, Math.floor((Date.now() - new Date(t).getTime()) / 60000)); }

// ─── PulsePoint Hook ────────────────────────────────────────────────
export function usePulsePoint(): PulsePointData {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [bureaus, setBureaus] = useState<BureauCounts>({});
  const [live, setLive] = useState(false);
  const [lastFetch, setLastFetch] = useState("");
  const [history, setHistory] = useState<number[]>([]);
  const histRef = useRef<number[]>([]);

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/pulsepoint");
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      if (d.ok && d.incidents) {
        setIncidents(d.incidents); setTotal(d.total); setBureaus(d.bureaus || {}); setLive(true);
        setLastFetch(new Date().toLocaleTimeString("en-US", { hour12: false, timeZone: "America/Los_Angeles" }));
        const next = [...histRef.current, d.total].slice(-40);
        histRef.current = next; setHistory(next);
      }
    } catch { setLive(false); }
  }, []);

  useEffect(() => { poll(); const i = setInterval(poll, 25000); return () => clearInterval(i); }, [poll]);
  return { incidents, total, bureaus, live, lastFetch, history };
}
