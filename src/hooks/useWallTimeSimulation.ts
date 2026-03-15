/**
 * WallTime Simulation Engine.
 * Research: Agent 3 (Data Structures, Algorithms), Agent 4 (alerts).
 * @see RESEARCH_AGENTS_REPORT.md, ENTERPRISE_ARCHITECTURE.md
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  SimUnit,
  SimHospital,
  SimIncident,
  SimAlert,
  UnitState,
  SimIncidentType,
  FleetDistributionSnapshot,
} from '../lib/simulationTypes';
import { createInitialSimHospitals, LA_HOSPITALS } from '../lib/hospitals';

const TICK_MS = 800;
const SIM_MINUTES_PER_TICK = 2;
const SPAWN_PROBABILITY_PER_TICK = 0.12;
const MAX_ACTIVE_INCIDENTS = 25;
const STRAIN_THRESHOLD_PCT = 50;
const ALERT_CAP = 20;

const INCIDENT_TYPES: SimIncidentType[] = ['EMS', 'FIRE', 'TC', 'EMS', 'EMS', 'TC', 'HAZMAT', 'RESCUE', 'OTHER'];
const LA_CENTER = { lat: 34.0522, lng: -118.2437 };
const LA_RADIUS = { lat: 0.06, lng: 0.12 };

function randomInRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Initial unit pool: RA and Engine across bureaus (Agent 3: Station 88, 92, etc.). */
function createInitialUnits(): SimUnit[] {
  const bureaus: Array<SimUnit['bureau']> = ['VALLEY', 'CENTRAL', 'WEST', 'SOUTH'];
  const units: SimUnit[] = [];
  let id = 1;
  bureaus.forEach((bureau) => {
    for (let i = 0; i < 6; i++) {
      units.push({
        id: `RA-SIM-${id}`,
        state: 'Available',
        incidentId: null,
        hospitalId: null,
        bureau,
        unitType: 'RA',
        stateEnteredAt: 0,
      });
      id++;
    }
    for (let i = 0; i < 4; i++) {
      units.push({
        id: `E-SIM-${id}`,
        state: 'Available',
        incidentId: null,
        hospitalId: null,
        bureau,
        unitType: 'Engine',
        stateEnteredAt: 0,
      });
      id++;
    }
  });
  return units;
}

/** Spawn one incident in LA area (Agent 3 coordinates). */
function spawnIncident(simMinute: number, incidentId: number): SimIncident {
  const lat = LA_CENTER.lat + randomInRange(-LA_RADIUS.lat, LA_RADIUS.lat);
  const lng = LA_CENTER.lng + randomInRange(-LA_RADIUS.lng, LA_RADIUS.lng);
  return {
    id: `INC-SIM-${incidentId}`,
    lat,
    lng,
    type: pick(INCIDENT_TYPES),
    priority: 1 + Math.floor(Math.random() * 3),
    status: 'Active',
    assignedUnitId: null,
    destinationHospitalId: null,
    createdAt: simMinute,
  };
}

/** Nearest hospital by straight-line distance (simplified; no routing). */
function nearestHospital(lat: number, lng: number, hospitals: SimHospital[]): SimHospital | null {
  let best: SimHospital | null = null;
  let bestD = Infinity;
  for (const h of hospitals) {
    if (h.status === 'CLOSED') continue;
    const d = (h.lat - lat) ** 2 + (h.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

/** Best hospital for diversion: OPEN or ED_SATURATION, lowest saturation then nearest. */
function bestDiversionHospital(lat: number, lng: number, hospitals: SimHospital[], excludeId?: string): SimHospital | null {
  const candidates = hospitals.filter(
    (h) =>
      h.id !== excludeId &&
      (h.status === 'OPEN' || h.status === 'ED_SATURATION') &&
      h.unitsAtWall < 5
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.saturationPct - b.saturationPct || 0);
  return nearestHospital(lat, lng, candidates) ?? candidates[0];
}

/** Apply LA County diversion rule (Agent 3): unitsAtWall >= 3 and avgWallTimeMin > 30 -> DIVERT. */
function updateHospitalStatus(h: SimHospital): SimHospital {
  let status = h.status;
  if (h.unitsAtWall >= 3 && h.avgWallTimeMin > 30) {
    status = 'DIVERT';
  } else if (h.saturationPct >= 90) {
    status = 'ED_SATURATION';
    if (h.unitsAtWall >= 2) status = 'DIVERT';
  } else if (h.saturationPct >= 60) {
    status = 'ED_SATURATION';
  } else {
    status = 'OPEN';
  }
  return { ...h, status };
}

/** Compute wall time in sim minutes for a unit at hospital (15–120 min, higher when saturated). Agent 3. */
function computeWallTimeMinutes(hospital: SimHospital): number {
  const base = 15 + Math.random() * 45;
  const saturationFactor = (hospital.saturationPct / 100) * 60;
  return Math.min(120, Math.round(base + saturationFactor));
}

/** Generate alerts from hospital and fleet state (Agent 4). */
function deriveAlerts(
  hospitals: SimHospital[],
  units: SimUnit[],
  simMinute: number,
  existingIds: Set<string>
): SimAlert[] {
  const alerts: SimAlert[] = [];
  const deployed = units.filter((u) => u.state !== 'Available' && u.state !== 'Cleared').length;
  const total = units.length;
  const pctDeployed = total > 0 ? (deployed / total) * 100 : 0;

  if (pctDeployed >= STRAIN_THRESHOLD_PCT) {
    const id = `strain-${simMinute}`;
    if (!existingIds.has(id)) {
      alerts.push({
        id,
        severity: pctDeployed >= 70 ? 'critical' : 'warning',
        message: `High system strain—${Math.round(pctDeployed)}% of fleet deployed. Prioritize clearance.`,
        timestamp: Date.now(),
      });
    }
  }

  hospitals.forEach((h) => {
    if (h.status !== 'DIVERT' && h.avgWallTimeMin <= 45 && h.saturationPct < 90) return;
    const nextBest = bestDiversionHospital(h.lat, h.lng, hospitals, h.id);
    const id = `divert-${h.id}-${simMinute}`;
    if (existingIds.has(id)) return;
    alerts.push({
      id,
      severity: h.status === 'DIVERT' ? 'critical' : 'warning',
      message: nextBest
        ? `Consider diverting from ${h.abbreviation} to ${nextBest.abbreviation}.`
        : `${h.abbreviation}: ED saturation ${h.saturationPct}%, avg wall ${h.avgWallTimeMin}m.`,
      timestamp: Date.now(),
      hospitalId: h.id,
    });
  });

  return alerts;
}

export interface UseWallTimeSimulationResult {
  units: SimUnit[];
  hospitals: SimHospital[];
  incidents: SimIncident[];
  alerts: SimAlert[];
  fleetDistribution: FleetDistributionSnapshot;
  simMinute: number;
}

export function useWallTimeSimulation(enabled: boolean = true): UseWallTimeSimulationResult {
  const [state, setState] = useState(() => ({
    units: createInitialUnits(),
    hospitals: createInitialSimHospitals(),
    incidents: [] as SimIncident[],
    alerts: [] as SimAlert[],
    simMinute: 0,
    nextIncidentId: 1,
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  const tick = useCallback(() => {
    const prev = stateRef.current;
    let {
      units,
      hospitals,
      incidents,
      alerts,
      simMinute,
      nextIncidentId,
    } = prev;

    simMinute += SIM_MINUTES_PER_TICK;

    const activeIncidents = incidents.filter((i) => i.status !== 'Cleared');
    if (activeIncidents.length < MAX_ACTIVE_INCIDENTS && Math.random() < SPAWN_PROBABILITY_PER_TICK) {
      const inc = spawnIncident(simMinute, nextIncidentId++);
      incidents = [...incidents, inc];
    }

    const availableUnits = units.filter((u) => u.state === 'Available');
    incidents = incidents.map((inc) => {
      if (inc.status !== 'Active' || inc.assignedUnitId) return inc;
      const u = availableUnits.shift();
      if (!u) return inc;
      return {
        ...inc,
        status: 'EnRoute',
        assignedUnitId: u.id,
      };
    });

    units = units.map((u) => {
      const inc = incidents.find((i) => i.assignedUnitId === u.id);
      const hospital = u.hospitalId ? hospitals.find((h) => h.id === u.hospitalId) : null;
      const elapsed = simMinute - u.stateEnteredAt;

      if (u.state === 'Available') {
        if (inc && inc.assignedUnitId === u.id) {
          return { ...u, state: 'EnRoute', incidentId: inc.id, stateEnteredAt: simMinute };
        }
        return u;
      }

      if (u.state === 'EnRoute' && inc) {
        if (elapsed >= 2 + Math.floor(Math.random() * 2)) {
          return {
            ...u,
            state: 'OnScene',
            stateEnteredAt: simMinute,
          };
        }
        return u;
      }

      if (u.state === 'OnScene' && inc) {
        if (elapsed >= 4 + Math.floor(Math.random() * 4)) {
          const dest = nearestHospital(inc.lat, inc.lng, hospitals) ?? LA_HOSPITALS[0];
          const destSim = hospitals.find((h) => h.id === dest.id) ?? hospitals[0];
          return {
            ...u,
            state: 'Transport',
            hospitalId: dest.id,
            stateEnteredAt: simMinute,
          };
        }
        return u;
      }

      if (u.state === 'Transport' && u.hospitalId) {
        const driveMin = 6 + Math.floor(Math.random() * 6);
        if (elapsed >= driveMin) {
          return {
            ...u,
            state: 'AtWall',
            stateEnteredAt: simMinute,
          };
        }
        return u;
      }

      if (u.state === 'AtWall' && u.hospitalId && hospital) {
        const wallMin = computeWallTimeMinutes(hospital);
        if (elapsed >= wallMin) {
          const updatedInc = incidents.find((i) => i.id === u.incidentId);
          if (updatedInc) {
            incidents = incidents.map((i) =>
              i.id === updatedInc.id ? { ...i, status: 'Cleared' as const } : i
            );
          }
          return {
            ...u,
            state: 'Cleared',
            incidentId: null,
            hospitalId: null,
            stateEnteredAt: simMinute,
          };
        }
        return u;
      }

      if (u.state === 'Cleared') {
        if (elapsed >= 1) {
          return {
            ...u,
            state: 'Available',
            stateEnteredAt: simMinute,
          };
        }
        return u;
      }

      return u;
    });

    hospitals = hospitals.map((h) => {
      const atWall = units.filter((u) => u.state === 'AtWall' && u.hospitalId === h.id).length;
      const wallTimes = units
        .filter((u) => u.hospitalId === h.id && u.state === 'AtWall')
        .map((u) => simMinute - u.stateEnteredAt);
      const avgWall =
        wallTimes.length > 0
          ? Math.round(wallTimes.reduce((a, b) => a + b, 0) / wallTimes.length)
          : h.avgWallTimeMin;
      const saturation = Math.min(100, h.saturationPct + (atWall > 0 ? 2 : -1) + Math.floor(Math.random() * 3));
      return updateHospitalStatus({
        ...h,
        unitsAtWall: atWall,
        avgWallTimeMin: avgWall,
        saturationPct: Math.max(0, saturation),
      });
    });

    const alertIds = new Set(alerts.map((a) => a.id));
    const newAlerts = deriveAlerts(hospitals, units, simMinute, alertIds);
    alerts = [...alerts, ...newAlerts].slice(-ALERT_CAP);

    setState({
      units,
      hospitals,
      incidents,
      alerts,
      simMinute,
      nextIncidentId,
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [enabled, tick]);

  const fleetDistribution: FleetDistributionSnapshot = {
    Available: 0,
    Dispatched: 0,
    EnRoute: 0,
    OnScene: 0,
    Transport: 0,
    AtWall: 0,
    Cleared: 0,
  };
  state.units.forEach((u) => {
    fleetDistribution[u.state]++;
  });

  return {
    units: state.units,
    hospitals: state.hospitals,
    incidents: state.incidents,
    alerts: state.alerts,
    fleetDistribution,
    simMinute: state.simMinute,
  };
}
