import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ──────────────────────────────────────────────────────────
export interface Unit {
  id: string;
  status: string;
}

export interface Incident {
  id: string;
  type: string;
  time: string;
  addr: string;
  lat: string;
  lng: string;
  agency: string;
  units: Unit[];
}

export type IncidentCategory = "ems" | "fire" | "tc" | "hazmat" | "rescue" | "other";

export interface BureauCounts {
  [key: string]: number;
}

export interface PulsePointData {
  incidents: Incident[];
  total: number;
  bureaus: BureauCounts;
  live: boolean;
  lastFetch: string;
  history: number[];
}

// ─── Constants ──────────────────────────────────────────────────────

export const TYPE_LABELS: Record<string, string> = {
  ME: "MEDICAL EMERGENCY", MA: "FIRE ALARM", MCI: "MASS CASUALTY", SF: "STRUCTURE FIRE",
  RF: "RESIDENTIAL FIRE", CF: "COMMERCIAL FIRE", WSF: "WORKING STRUCTURE", WRF: "WORKING RESIDENTIAL",
  WCF: "WORKING COMMERCIAL", FULL: "FULL ASSIGNMENT", VF: "VEHICLE FIRE", VEG: "VEGETATION FIRE",
  WVEG: "WORKING VEGETATION", TC: "TRAFFIC COLLISION", TCE: "EXTRICATION TC", FA: "FIRE ALARM",
  GAS: "GAS LEAK", EE: "ELECTRICAL EMERGENCY", HMR: "HAZMAT RESPONSE", EX: "EXPLOSION",
  CHIM: "CHIMNEY FIRE", OF: "OUTSIDE FIRE", FIRE: "FIRE", AF: "APPLIANCE FIRE",
  PF: "POLE FIRE", ELF: "ELECTRICAL FIRE", WR: "WATER RESCUE", RES: "RESCUE",
  TR: "TECHNICAL RESCUE", ELR: "ELEVATOR RESCUE", LA: "LIFT ASSIST", SI: "SMOKE INVESTIGATION",
  OI: "ODOR INVESTIGATION", INV: "INVESTIGATION", WD: "WIRES DOWN", WA: "WIRES ARCING",
  TD: "TREE DOWN", HC: "HAZARDOUS CONDITION", PS: "PUBLIC SERVICE", PA: "POLICE ASSIST",
  AED: "AED ALARM", SD: "SMOKE DETECTOR", TRBL: "TROUBLE ALARM", WFA: "WATERFLOW ALARM",
  FL: "FLOODING", LR: "LADDER REQUEST", SH: "SHEARED HYDRANT", PE: "PIPELINE EMERGENCY",
  CB: "CONTROLLED BURN", EF: "EXTINGUISHED FIRE", IF: "ILLEGAL FIRE", MF: "MARINE FIRE",
  GF: "REFUSE FIRE", BT: "BOMB THREAT", EM: "EMERGENCY", ER: "EMERGENCY RESPONSE",
  WE: "WATER EMERGENCY", AI: "ARSON INVESTIGATION", HMI: "HAZMAT INVESTIGATION",
  LO: "LOCKOUT", CL: "COMMERCIAL LOCKOUT", RL: "RESIDENTIAL LOCKOUT", VL: "VEHICLE LOCKOUT",
  IFT: "INTERFACILITY TRANSFER", AR: "ANIMAL RESCUE", CR: "CLIFF RESCUE",
  CSR: "CONFINED SPACE", TNR: "TRENCH RESCUE", USAR: "USAR", VS: "VESSEL SINKING",
  RR: "ROPE RESCUE", TCS: "TC/STRUCTURE", TCT: "TC/TRAIN", RTE: "TRAIN EMERGENCY",
  EQ: "EARTHQUAKE", CA: "COMMUNITY ACTIVITY", FW: "FIRE WATCH", NO: "NOTIFICATION",
  STBY: "STANDBY", TEST: "TEST", TRNG: "TRAINING", UNK: "UNKNOWN",
};

export const TYPE_SHORT: Record<string, string> = {
  ME: "EMS", MA: "FA", MCI: "MCI", SF: "STR", RF: "STR", CF: "STR",
  WSF: "WSTR", WRF: "WSTR", WCF: "WSTR", FULL: "FULL", VF: "VEH",
  VEG: "VEG", WVEG: "WVEG", TC: "TC", TCE: "TCX", FA: "FA",
  GAS: "GAS", EE: "ELEC", HMR: "HAZ", EX: "EXPL", CHIM: "CHIM",
  OF: "FIRE", FIRE: "FIRE", AF: "FIRE", PF: "POLE", ELF: "ELEC",
  WR: "H2O", RES: "RES", TR: "TECH", ELR: "ELEV", LA: "LIFT",
  SI: "INV", OI: "INV", INV: "INV", WD: "WIRE", WA: "WIRE",
  TD: "TREE", HC: "HAZ", PS: "PS", PA: "PA", AED: "AED",
  IFT: "IFT", AR: "ARES", CR: "CLIFF", CSR: "CSPC",
  TNR: "TRCH", USAR: "USAR", RR: "ROPE", FL: "FLOOD",
};

export const STATUS_LABELS: Record<string, string> = {
  Dispatched: "DISPATCHED", Enroute: "EN ROUTE", OnScene: "ON SCENE",
  Transport: "TRANSPORT", TransportArrived: "AT HOSPITAL",
  Available: "AVAILABLE", Cleared: "CLEARED", AtHospital: "AT HOSPITAL",
};

export const STATUS_COLORS: Record<string, string> = {
  Dispatched: "#F59E0B", Enroute: "#3B82F6", OnScene: "#EF4444",
  Transport: "#A855F7", TransportArrived: "#06B6D4",
  Available: "#10B981", Cleared: "#6B7280", AtHospital: "#06B6D4",
};

export const BUREAU_NAMES: Record<string, string> = {
  LAFDC: "CENTRAL", LAFDS: "SOUTH", LAFDV: "VALLEY", LAFDW: "WEST",
};

// ─── Category Helper ────────────────────────────────────────────────

const EMS_TYPES = new Set(["ME", "MA", "AED", "MCI", "IFT"]);
const FIRE_TYPES = new Set(["SF", "RF", "CF", "WSF", "WRF", "WCF", "FULL", "AF", "CHIM", "ELF", "PF", "FIRE", "OF", "VF", "GF", "IF", "EF", "MF", "CB", "VEG", "WVEG"]);
const TC_TYPES = new Set(["TC", "TCE", "TCS", "TCT"]);
const HAZMAT_TYPES = new Set(["HMR", "GAS", "EX", "HMI", "PE", "HC"]);
const RESCUE_TYPES = new Set(["WR", "RES", "TR", "ELR", "AR", "CR", "CSR", "TNR", "USAR", "VS", "RR", "RTE", "LO", "CL", "RL", "VL"]);

export function getCategory(type: string): IncidentCategory {
  if (EMS_TYPES.has(type)) return "ems";
  if (FIRE_TYPES.has(type)) return "fire";
  if (TC_TYPES.has(type)) return "tc";
  if (HAZMAT_TYPES.has(type)) return "hazmat";
  if (RESCUE_TYPES.has(type)) return "rescue";
  return "other";
}

export const CATEGORY_COLORS: Record<IncidentCategory, string> = {
  ems: "#F97316", fire: "#EF4444", tc: "#EAB308",
  hazmat: "#A855F7", rescue: "#06B6D4", other: "#6B7280",
};

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  ems: "EMS", fire: "FIRE", tc: "TC", hazmat: "HAZMAT", rescue: "RESCUE", other: "OTHER",
};

// ─── Utility ────────────────────────────────────────────────────────

export function getMostActiveStatus(units: Unit[]): string {
  const statuses = units.map((u) => u.status);
  if (statuses.includes("OnScene")) return "OnScene";
  if (statuses.includes("Enroute")) return "Enroute";
  if (statuses.includes("Transport")) return "Transport";
  if (statuses.includes("Dispatched")) return "Dispatched";
  if (statuses.includes("TransportArrived")) return "TransportArrived";
  if (statuses.includes("AtHospital")) return "AtHospital";
  return statuses[0] || "Unknown";
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
  if (id.startsWith("AO")) return "ARSON";
  if (id.startsWith("BU")) return "BRUSH UNIT";
  return "UNIT";
}

export function formatTime(isoTime: string): string {
  if (!isoTime) return "--:--";
  return isoTime.substring(11, 16);
}

export function formatAddress(addr: string): string {
  return (addr || "").split(",")[0].toUpperCase();
}

export function elapsedMinutes(isoTime: string): number {
  if (!isoTime) return 0;
  const then = new Date(isoTime).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 60000));
}

// ─── Hook ───────────────────────────────────────────────────────────

export function usePulsePoint(): PulsePointData {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [bureaus, setBureaus] = useState<BureauCounts>({});
  const [live, setLive] = useState(false);
  const [lastFetch, setLastFetch] = useState("");
  const [history, setHistory] = useState<number[]>([]);
  const historyRef = useRef<number[]>([]);

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/pulsepoint");
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      if (d.ok && d.incidents) {
        setIncidents(d.incidents);
        setTotal(d.total);
        setBureaus(d.bureaus || {});
        setLive(true);
        setLastFetch(
          new Date().toLocaleTimeString("en-US", {
            hour12: false,
            timeZone: "America/Los_Angeles",
          })
        );
        // Track history for sparkline (keep last 30 data points)
        const next = [...historyRef.current, d.total].slice(-30);
        historyRef.current = next;
        setHistory(next);
      }
    } catch {
      setLive(false);
    }
  }, []);

  useEffect(() => {
    poll();
    const i = setInterval(poll, 25000);
    return () => clearInterval(i);
  }, [poll]);

  return { incidents, total, bureaus, live, lastFetch, history };
}
