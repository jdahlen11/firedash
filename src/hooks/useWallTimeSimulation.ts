/**
 * WallTime Simulation Engine — v2
 * Incidents now spawn near real LAFD station cluster locations.
 * Hospital routing uses bureau-aware nearest-hospital logic so
 * e.g. Valley units never transport to South Bay hospitals.
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
import { createInitialSimHospitals, LA_HOSPITALS, findNearestHospital } from '../lib/hospitals';
import { STATION_LOCATIONS, type LAFDBureau } from '../lib/stationLocations';

const TICK_MS = 600000; // 10 minutes — freeze display, no flashing numbers
const SIM_MINUTES_PER_TICK = 2;
const SPAWN_PROBABILITY_PER_TICK = 0.12;
const MAX_ACTIVE_INCIDENTS = 25;
const STRAIN_THRESHOLD_PCT = 50;
const ALERT_CAP = 20;

const INCIDENT_TYPES: SimIncidentType[] = ['EMS', 'FIRE', 'TC', 'EMS', 'EMS', 'TC', 'HAZMAT', 'RESCUE', 'OTHER'];

function randomInRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Spawn incident near a real LAFD station location (small geographic jitter).
 * This ensures incidents are geographically plausible rather than randomly
 * scattered across a bounding box.
 */
function spawnIncident(simMinute: number, incidentId: number): SimIncident {
  const stn = pick(STATION_LOCATIONS);
  const lat = stn.lat + randomInRange(-0.015, 0.015);
  const lng = stn.lng + randomInRange(-0.025, 0.025);
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
    // Synthetic address for display
    address: `${stn.neighborhood} area`,
  };
}

/**
 * Build initial unit pool from real station locations.
 * One RA and one Engine per station gives realistic geographic spread.
 * Bureau assignment comes directly from the station data.
 */
function createInitialUnits(): SimUnit[] {
  const units: SimUnit[] = [];
  let id = 1;
  for (const stn of STATION_LOCATIONS) {
    units.push({
      id: `RA-${stn.station}`,
      state: 'Available',
      incidentId: null,
      hospitalId: null,
      bureau: stn.bureau,
      unitType: 'RA',
      stateEnteredAt: 0,
    });
    // Add Engine for Central and Valley clusters only (keeps total manageable)
    if (stn.bureau === 'CENTRAL' || stn.bureau === 'VALLEY') {
      units.push({
        id: `E-${stn.station}`,
        state: 'Available',
        incidentId: null,
        hospitalId: null,
        bureau: stn.bureau,
        unitType: 'Engine',
        stateEnteredAt: 0,
      });
    }
    id++;
  }
  return units;
}

/**
 * Nearest *open* hospital to given coords, preferring the unit's bureau.
 * Falls back to any open hospital if none found in bureau.
 */
function nearestHospital(
  lat: number,
  lng: number,
  hospitals: SimHospital[],
  bureau?: LAFDBureau,
): SimHospital | null {
  const open = hospitals.filter((h) => h.status !== 'CLOSED');
  if (!open.length) return null;

  function dist(h: SimHospital) {
    return (h.lat - lat) ** 2 + (h.lng - lng) ** 2;
  }

  if (bureau) {
    // Match against the static bureau list so we know each hospital's bureaus
    const bureauIds = new Set(
      LA_HOSPITALS.filter((h) => h.bureaus.includes(bureau)).map((h) => h.id),
    );
    const bureauCandidates = open.filter((h) => bureauIds.has(h.id));
    if (bureauCandidates.length) {
      return bureauCandidates.reduce((best, h) => (dist(h) < dist(best) ? h : best));
    }
  }

  // Fallback to absolute nearest open hospital
  return open.reduce((best, h) => (dist(h) < dist(best) ? h : best));
}

function bestDiversionHospital(
  lat: number,
  lng: number,
  hospitals: SimHospital[],
  excludeId?: string,
): SimHospital | null {
  const candidates = hospitals.filter(
    (h) => h.id !== excludeId && (h.status === 'OPEN' || h.status === 'ED_SATURATION') && h.unitsAtWall < 5,
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.saturationPct - b.saturationPct);
  return nearestHospital(lat, lng, candidates) ?? candidates[0];
}

function updateHospitalStatus(h: SimHospital): SimHospital {
  let status = h.status;
  if (h.unitsAtWall >= 3 && h.avgWallTimeMin > 30) {
    status = 'DIVERT';
  } else if (h.saturationPct >= 90) {
    status = h.unitsAtWall >= 2 ? 'DIVERT' : 'ED_SATURATION';
  } else if (h.saturationPct >= 60) {
    status = 'ED_SATURATION';
  } else {
    status = 'OPEN';
  }
  return { ...h, status };
}

function computeWallTimeMinutes(hospital: SimHospital): number {
  const base = 15 + Math.random() * 45;
  const saturationFactor = (hospital.saturationPct / 100) * 60;
  return Math.min(120, Math.round(base + saturationFactor));
}

function deriveAlerts(
  hospitals: SimHospital[],
  units: SimUnit[],
  simMinute: number,
  existingIds: Set<string>,
): SimAlert[] {
  const alerts: SimAlert[] = [];
  const deployed = units.filter((u) => u.state !== 'Available' && u.state !== 'Cleared').length;
  const pctDeployed = units.length > 0 ? (deployed / units.length) * 100 : 0;

  if (pctDeployed >= STRAIN_THRESHOLD_PCT) {
    const id = `strain-${simMinute}`;
    if (!existingIds.has(id)) {
      alerts.push({
        id,
        severity: pctDeployed >= 70 ? 'critical' : 'warning',
        message: `High system strain — ${Math.round(pctDeployed)}% of fleet deployed. Prioritize clearance.`,
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

export function useWallTimeSimulation(enabled = true): UseWallTimeSimulationResult {
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
    let { units, hospitals, incidents, alerts, simMinute, nextIncidentId } = prev;

    simMinute += SIM_MINUTES_PER_TICK;

    // Spawn incident near a real station location
    const activeIncidents = incidents.filter((i) => i.status !== 'Cleared');
    if (activeIncidents.length < MAX_ACTIVE_INCIDENTS && Math.random() < SPAWN_PROBABILITY_PER_TICK) {
      incidents = [...incidents, spawnIncident(simMinute, nextIncidentId++)];
    }

    // Assign available units to unassigned active incidents
    const availableUnits = units.filter((u) => u.state === 'Available');
    incidents = incidents.map((inc) => {
      if (inc.status !== 'Active' || inc.assignedUnitId) return inc;
      const u = availableUnits.shift();
      if (!u) return inc;
      return { ...inc, status: 'EnRoute', assignedUnitId: u.id };
    });

    // Advance unit state machine
    units = units.map((u) => {
      const inc = incidents.find((i) => i.assignedUnitId === u.id);
      const hospital = u.hospitalId ? hospitals.find((h) => h.id === u.hospitalId) : null;
      const elapsed = simMinute - u.stateEnteredAt;

      if (u.state === 'Available') {
        if (inc && inc.assignedUnitId === u.id) {
          return { ...u, state: 'EnRoute' as UnitState, incidentId: inc.id, stateEnteredAt: simMinute };
        }
        return u;
      }

      if (u.state === 'EnRoute' && inc) {
        if (elapsed >= 2 + Math.floor(Math.random() * 2)) {
          return { ...u, state: 'OnScene' as UnitState, stateEnteredAt: simMinute };
        }
        return u;
      }

      if (u.state === 'OnScene' && inc) {
        if (elapsed >= 4 + Math.floor(Math.random() * 4)) {
          // Route to nearest hospital for this unit's bureau — the core geographic fix
          const dest = nearestHospital(inc.lat, inc.lng, hospitals, u.bureau);
          if (!dest) return u;
          return { ...u, state: 'Transport' as UnitState, hospitalId: dest.id, stateEnteredAt: simMinute };
        }
        return u;
      }

      if (u.state === 'Transport' && u.hospitalId) {
        if (elapsed >= 6 + Math.floor(Math.random() * 6)) {
          return { ...u, state: 'AtWall' as UnitState, stateEnteredAt: simMinute };
        }
        return u;
      }

      if (u.state === 'AtWall' && u.hospitalId && hospital) {
        const wallMin = computeWallTimeMinutes(hospital);
        if (elapsed >= wallMin) {
          if (inc) {
            incidents = incidents.map((i) =>
              i.id === inc.id ? { ...i, status: 'Cleared' as const } : i,
            );
          }
          return {
            ...u,
            state: 'Cleared' as UnitState,
            incidentId: null,
            hospitalId: null,
            stateEnteredAt: simMinute,
          };
        }
        return u;
      }

      if (u.state === 'Cleared') {
        if (elapsed >= 1) {
          return { ...u, state: 'Available' as UnitState, stateEnteredAt: simMinute };
        }
        return u;
      }

      return u;
    });

    // Update hospital saturation metrics
    hospitals = hospitals.map((h) => {
      const atWall = units.filter((u) => u.state === 'AtWall' && u.hospitalId === h.id).length;
      const wallTimes = units
        .filter((u) => u.hospitalId === h.id && u.state === 'AtWall')
        .map((u) => simMinute - u.stateEnteredAt);
      const avgWall =
        wallTimes.length > 0
          ? Math.round(wallTimes.reduce((a, b) => a + b, 0) / wallTimes.length)
          : h.avgWallTimeMin;
      const saturation = Math.min(
        100,
        h.saturationPct + (atWall > 0 ? 2 : -1) + Math.floor(Math.random() * 3),
      );
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

    setState({ units, hospitals, incidents, alerts, simMinute, nextIncidentId });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [enabled, tick]);

  const fleetDistribution: FleetDistributionSnapshot = {
    Available: 0, Dispatched: 0, EnRoute: 0, OnScene: 0, Transport: 0, AtWall: 0, Cleared: 0,
  };
  state.units.forEach((u) => { fleetDistribution[u.state]++; });

  return {
    units: state.units,
    hospitals: state.hospitals,
    incidents: state.incidents,
    alerts: state.alerts,
    fleetDistribution,
    simMinute: state.simMinute,
  };
}
